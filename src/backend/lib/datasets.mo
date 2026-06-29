import Array "mo:core/Array";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Types "../types/datasets";

module {
  public type Dataset = Types.Dataset;
  public type DatasetId = Types.DatasetId;
  public type SignalRow = Types.SignalRow;
  public type Settings = Types.Settings;
  public type Datasets = Map.Map<DatasetId, Dataset>;

  // ───────────────────────────────────────────────────────────────────────
  // CSV parsing
  // ───────────────────────────────────────────────────────────────────────
  // The TradingView alert CSV has 5 top-level columns:
  //   Alert ID, Ticker, Name, Description, Time
  // The Description field is an embedded JSON string with ~48 strategy keys
  // (OHLC, BB levels, touchDepth, snapback/pushThrough flags, minutesIntoBar,
  // inSession, decisionEvent, mode, ...). The Ticker field embeds the
  // timeframe after a comma (e.g. "ALCHEMY:DJ30.R, 1m"). The timeframe JSON
  // key is a string of minutes ("1" = 1m). The CSV has NO RSI column and NO
  // explicit Bollinger basis/middle column — those are computed later.
  //
  // We do a minimal, dependency-free CSV + JSON parse: split on newlines,
  // split each row on commas (respecting quoted fields), then extract the
  // known keys from the Description JSON via substring scanning. This avoids
  // pulling in a JSON library and keeps the canister self-contained.

  private func splitLines(text : Text) : [Text] {
    // Normalize CRLF -> LF, then split on '\n'.
    let normalized = text.replace(#text "\r\n", "\n");
    normalized.split(#text "\n").toArray();
  };

  // Split a single CSV row into fields, honouring double-quoted fields that
  // may contain commas (the Description column is always quoted).
  private func splitCsvRow(line : Text) : [Text] {
    // Walk char-by-char, accumulate into a mutable buffer.
    var current = "";
    var quoted = false;
    var acc : [Text] = [];
    for (c in line.toIter()) {
      if (quoted) {
        if (c == '\"') {
          quoted := false;
        } else {
          current := current # Text.fromChar(c);
        };
      } else {
        if (c == '\"') {
          quoted := true;
        } else if (c == ',') {
          acc := acc.concat([current]);
          current := "";
        } else {
          current := current # Text.fromChar(c);
        };
      };
    };
    acc.concat([current]);
  };

  // Safe field accessor: returns "" for out-of-bounds indices.
  private func fieldAt(fields : [Text], i : Nat) : Text {
    if (i < fields.size()) { fields[i] } else { "" };
  };

  // Extract a JSON string value for a given key from a JSON text blob.
  // Looks for `"key":"value"` or `"key": value` patterns. Returns the raw
  // value text (without surrounding quotes for string values).
  private func jsonField(json : Text, key : Text) : ?Text {
    let needle = "\"" # key # "\"";
    let pos = json.contains(#text needle);
    if (not pos) { return null };
    // Find the index of the needle.
    let jsonChars = json.toArray();
    let needleChars = needle.toArray();
    let jLen = jsonChars.size();
    let nLen = needleChars.size();
    var i = 0;
    var found : Int = -1;
    label find while (i <= jLen - nLen) {
      var match = true;
      var k = 0;
      while (k < nLen) {
        if (jsonChars[i + k] != needleChars[k]) { match := false; k := nLen };
        k := k + 1;
      };
      if (match) { found := i; i := jLen } else { i := i + 1 };
    };
    if (found < 0) { return null };
    // Skip past the needle and any whitespace, then the colon, then whitespace.
    var p : Nat = Int.toNat(found + nLen);
    while (p < jLen and (jsonChars[p] == ' ' or jsonChars[p] == '\t')) { p := p + 1 };
    if (p >= jLen or jsonChars[p] != ':') { return null };
    p := p + 1;
    while (p < jLen and (jsonChars[p] == ' ' or jsonChars[p] == '\t')) { p := p + 1 };
    if (p >= jLen) { return null };
    // String value (quoted) vs bare value (number/bool).
    if (jsonChars[p] == '\"') {
      p := p + 1;
      var end : Nat = p;
      while (end < jLen and jsonChars[end] != '\"') { end := end + 1 };
      ?Text.fromArray(jsonChars.sliceToArray(p, end));
    } else {
      // Bare value: read until comma, brace, or bracket.
      var end : Nat = p;
      while (end < jLen and jsonChars[end] != ',' and jsonChars[end] != '}' and jsonChars[end] != ']' and jsonChars[end] != ' ') { end := end + 1 };
      ?Text.fromArray(jsonChars.sliceToArray(p, end));
    };
  };

  private func jsonFieldFloat(json : Text, key : Text) : Float {
    switch (jsonField(json, key)) {
      case (?v) { textToFloat(v) };
      case null 0.0;
    };
  };

  private func jsonFieldBool(json : Text, key : Text) : Bool {
    switch (jsonField(json, key)) {
      case (?v) { v == "true" or v == "True" or v == "1" };
      case null false;
    };
  };

  private func jsonFieldText(json : Text, key : Text) : Text {
    switch (jsonField(json, key)) {
      case (?v) v;
      case null "";
    };
  };

  // Minimal Text -> Float for the numeric JSON values we expect (decimal
  // numbers, possibly negative, possibly with exponent). Motoko's Float
  // module does not expose fromText, so we parse manually.
  private func textToFloat(t : Text) : Float {
    let chars = t.toArray();
    let n = chars.size();
    if (n == 0) { return 0.0 };
    var i = 0;
    var neg = false;
    if (chars[0] == '-') { neg := true; i := 1 } else if (chars[0] == '+') { i := 1 };
    var intPart : Float = 0.0;
    var fracPart : Float = 0.0;
    var fracDiv : Float = 10.0;
    var inFrac = false;
    var exp : Int = 0;
    var expNeg = false;
    var inExp = false;
    while (i < n) {
      let c = chars[i];
      if (c >= '0' and c <= '9') {
        let d = charToDigit(c);
        if (inExp) {
          exp := exp * 10 + d;
        } else if (inFrac) {
          fracPart := fracPart + (Float.fromInt(d) / fracDiv);
          fracDiv := fracDiv * 10.0;
        } else {
          intPart := intPart * 10.0 + Float.fromInt(d);
        };
      } else if (c == '.') {
        inFrac := true;
      } else if (c == 'e' or c == 'E') {
        inExp := true;
        inFrac := false;
        if (i + 1 < n and chars[i + 1] == '-') { expNeg := true; i := i + 1 } else if (i + 1 < n and chars[i + 1] == '+') { i := i + 1 };
      } else {
        // Unknown char — stop.
        i := n;
      };
      i := i + 1;
    };
    var value = intPart + fracPart;
    if (exp != 0) {
      let e = if (expNeg) { -exp } else { exp };
      value := value * Float.pow(10.0, Float.fromInt(e));
    };
    if (neg) { -value } else { value };
  };

  private func charToDigit(c : Char) : Int {
    switch (c) {
      case '0' 0; case '1' 1; case '2' 2; case '3' 3; case '4' 4;
      case '5' 5; case '6' 6; case '7' 7; case '8' 8; case '9' 9;
      case _ 0;
    };
  };

  // Parse the asset symbol out of a Ticker field like "ALCHEMY:DJ30.R, 1m".
  // Returns the symbol portion (e.g. "DJ30.R") and the timeframe label
  // (e.g. "1m"). The timeframe JSON key (string of minutes) is preferred
  // when present in the Description.
  private func parseTicker(ticker : Text) : (Text, Text) {
    // Strip the exchange prefix up to ':' if present.
    let afterExchange = switch (ticker.stripStart(#text "ALCHEMY:")) {
      case (?rest) rest;
      case null ticker;
    };
    // The timeframe follows a comma.
    let parts = afterExchange.split(#text ",").toArray();
    let symbol = parts[0].trim(#char ' ');
    let tfLabel = if (parts.size() > 1) { parts[1].trim(#char ' ') } else { "" };
    (symbol, tfLabel);
  };

  // Convert a timeframe label like "1m", "3m", "1h" into a canonical
  // minutes string ("1", "3", "60"). Falls back to the label itself.
  private func timeframeToMinutes(tf : Text) : Text {
    if (tf.endsWith(#text "m")) {
      switch (tf.stripEnd(#text "m")) {
        case (?rest) rest;
        case null tf;
      };
    } else if (tf.endsWith(#text "h")) {
      let mins = switch (tf.stripEnd(#text "h")) {
        case (?h) h;
        case null tf;
      };
      switch (Nat.fromText(mins)) {
        case (?n) Nat.toText(n * 60);
        case null tf;
      };
    } else { tf };
  };

  // Parse raw CSV text into SignalRow[] (no signal classification yet —
  // signalType is set to #noTrade and filled in by classifySignals).
  public func parseCsv(csvText : Text) : [SignalRow] {
    let lines = splitLines(csvText);
    if (lines.size() < 2) { return [] };
    // First line is the header: Alert ID, Ticker, Name, Description, Time.
    let dataLines = lines.sliceToArray(1, lines.size());
    dataLines.map<Text, SignalRow>(
      func(line) {
        if (line.isEmpty()) {
          // Skip blank lines by emitting a no-op row that classifySignals
          // will leave as #noTrade; the frontend can filter on empty alertId.
          emptyRow();
        } else {
          let fields = splitCsvRow(line);
          let alertId = fieldAt(fields, 0);
          let tickerRaw = fieldAt(fields, 1);
          let name = fieldAt(fields, 2);
          let description = fieldAt(fields, 3);
          let time = fieldAt(fields, 4);

          let (asset, tfLabel) = parseTicker(tickerRaw);
          // Prefer the timeframe JSON key (string of minutes) when present.
          let tfFromJson = jsonFieldText(description, "timeframe");
          let timeframe = if (tfFromJson.isEmpty()) {
            timeframeToMinutes(tfLabel);
          } else { tfFromJson };

          {
            alertId;
            ticker = tickerRaw;
            name;
            time;
            asset;
            timeframe;
            open = jsonFieldFloat(description, "open");
            high = jsonFieldFloat(description, "high");
            low = jsonFieldFloat(description, "low");
            close = jsonFieldFloat(description, "close");
            bbUpper = jsonFieldFloat(description, "bbUpper");
            bbLower = jsonFieldFloat(description, "bbLower");
            bbBasis = 0.0; // derived later by deriveBasis
            bandWidth = jsonFieldFloat(description, "bandWidth");
            touchDepth = jsonFieldFloat(description, "touchDepth");
            touchDepthRatio = jsonFieldFloat(description, "touchDepthRatio");
            longSnapback = jsonFieldBool(description, "longSnapback");
            shortSnapback = jsonFieldBool(description, "shortSnapback");
            pushThrough = jsonFieldBool(description, "pushThrough");
            minutesIntoBar = jsonFieldFloat(description, "minutesIntoBar");
            inSession = jsonFieldBool(description, "inSession");
            rsi = 0.0; // computed later by computeRsi
            decisionEvent = jsonFieldText(description, "decisionEvent");
            mode = jsonFieldText(description, "mode");
            signalType = #noTrade;
          };
        };
      },
    );
  };

  private func emptyRow() : SignalRow {
    {
      alertId = "";
      ticker = "";
      name = "";
      time = "";
      asset = "";
      timeframe = "";
      open = 0.0; high = 0.0; low = 0.0; close = 0.0;
      bbUpper = 0.0; bbLower = 0.0; bbBasis = 0.0; bandWidth = 0.0;
      touchDepth = 0.0; touchDepthRatio = 0.0;
      longSnapback = false; shortSnapback = false; pushThrough = false;
      minutesIntoBar = 0.0; inSession = false; rsi = 0.0;
      decisionEvent = ""; mode = ""; signalType = #noTrade;
    };
  };

  // ───────────────────────────────────────────────────────────────────────
  // Bollinger basis derivation: (upper + lower) / 2
  // ───────────────────────────────────────────────────────────────────────
  public func deriveBasis(rows : [SignalRow]) : [SignalRow] {
    rows.map<SignalRow, SignalRow>(
      func(r) {
        { r with bbBasis = (r.bbUpper + r.bbLower) / 2.0 };
      },
    );
  };

  // ───────────────────────────────────────────────────────────────────────
  // RSI computation (Wilder's smoothing), 9-period by default to match the
  // BB length. Computed per (asset, timeframe) group so each series has its
  // own independent RSI.
  // ───────────────────────────────────────────────────────────────────────
  public func computeRsi(rows : [SignalRow], period : Nat) : [SignalRow] {
    if (rows.size() == 0) { return rows };
    // Group indices by (asset, timeframe).
    let groups = Map.empty<Text, [Nat]>();
    let indexed = rows.enumerate();
    for ((idx, r) in indexed) {
      let key = r.asset # "|" # r.timeframe;
      let existing = groups.get(key);
      let updated = switch (existing) {
        case (?arr) arr.concat([idx]);
        case null [idx];
      };
      groups.add(key, updated);
    };

    // Build a mutable copy of rows so we can write RSI back in place.
    let out = rows.toVarArray<SignalRow>();

    for ((key, indices) in groups.entries()) {
      // Collect closes in original order (indices are already ascending).
      let closes = indices.map(
        func(i) {
          let r = out[i];
          r.close;
        },
      );
      let rsiSeries = rsiSeriesFromCloses(closes, period);
      // Write RSI back.
      for (j in indices.keys()) {
        let i = indices[j];
        let r = out[i];
        out[i] := { r with rsi = rsiSeries[j] };
      };
    };

    Array.fromVarArray(out);
  };

  // Compute RSI for a single close-price series using Wilder's smoothing.
  // Returns an array aligned with the input. The first `period` entries
  // have RSI 0.0 (insufficient data).
  private func rsiSeriesFromCloses(closes : [Float], period : Nat) : [Float] {
    let n = closes.size();
    let result : [var Float] = Array.tabulate<Float>(n, func _ = 0.0).toVarArray();
    if (n <= period) { return Array.fromVarArray(result) };
    // Initial gains/losses over the first `period` deltas.
    var gainSum = 0.0;
    var lossSum = 0.0;
    var i = 1;
    while (i <= period) {
      let diff = closes[i] - closes[i - 1];
      if (diff >= 0.0) { gainSum := gainSum + diff } else { lossSum := lossSum - diff };
      i := i + 1;
    };
    var avgGain = gainSum / Float.fromInt(period);
    var avgLoss = lossSum / Float.fromInt(period);
    // First RSI at index `period`.
    let firstRs = if (avgLoss == 0.0) { 100.0 } else { avgGain / avgLoss };
    result[period] := 100.0 - (100.0 / (1.0 + firstRs));
    // Wilder smoothing for the rest.
    var idx = period + 1;
    let pFloat = Float.fromInt(period);
    while (idx < n) {
      let diff = closes[idx] - closes[idx - 1];
      let gain = if (diff > 0.0) diff else 0.0;
      let loss = if (diff < 0.0) -diff else 0.0;
      avgGain := (avgGain * (pFloat - 1.0) + gain) / pFloat;
      avgLoss := (avgLoss * (pFloat - 1.0) + loss) / pFloat;
      let rs = if (avgLoss == 0.0) { 100.0 } else { avgGain / avgLoss };
      result[idx] := 100.0 - (100.0 / (1.0 + rs));
      idx := idx + 1;
    };
    Array.fromVarArray(result);
  };

  // ───────────────────────────────────────────────────────────────────────
  // Signal classification
  // ───────────────────────────────────────────────────────────────────────
  // Classify each row's signalType from raw indicator data, applying the
  // provided settings. Ignores the script's SKIP/DO NOT HOLD action logic —
  // we classify purely from touchDepth, touchDepthRatio, snapback/pushThrough
  // flags, first_touch (via decisionEvent/mode), newLongTouch/newShortTouch,
  // bandWidth, and the computed RSI.
  //
  // Educational paper-analysis only — not financial advice.
  public func classifySignals(rows : [SignalRow], settings : Settings) : [SignalRow] {
    if (rows.size() == 0) { return rows };

    // Precompute a moving average of bandWidth per (asset, timeframe) group
    // for the volatility filter. We use a simple rolling window of the same
    // length as the BB length.
    let bandWidthMa = computeBandWidthMa(rows, settings.bbLength);

    // Precompute the 90th-percentile threshold of touchDepthRatio per group
    // for the minutes-into-bar filter.
    let tdrP90 = computeTouchDepthRatioP90(rows);

    // Precompute higher-timeframe directional bias per asset for MTF
    // alignment. Higher TFs = 15m ("15") and 1h ("60").
    let htfBias = computeHtfBias(rows);

    rows.mapEntries<SignalRow, SignalRow>(
      func(r, idx) {
        if (r.alertId.isEmpty()) { r } else {
          let signalType = classifyRow(
            r,
            settings,
            bandWidthMa[idx],
            tdrP90,
            htfBias,
          );
          { r with signalType };
        };
      },
    );
  };

  // Classify a single row. Returns the SignalType.
  private func classifyRow(
    r : SignalRow,
    s : Settings,
    bandWidthMa : Float,
    tdrP90 : Map.Map<Text, Float>,
    htfBias : Map.Map<Text, HTFBias>,
  ) : Types.SignalType {
    let isFirstTouch = (r.decisionEvent == "first_touch" or r.mode == "first_touch");
    let bandWidthAboveMa = bandWidthMa > 0.0 and r.bandWidth > bandWidthMa * s.minBandWidthRatio;
    let bandWidthExpanding = bandWidthMa > 0.0 and r.bandWidth > bandWidthMa;

    // Minutes-into-bar filter: early (<0.5) entries only allowed if
    // touchDepthRatio >= 90th percentile; otherwise require > 0.85.
    let groupKey = r.asset # "|" # r.timeframe;
    let p90 = switch (tdrP90.get(groupKey)) {
      case (?v) v;
      case null 100.0;
    };
    let earlyBar = r.minutesIntoBar < 0.5;
    let lateBar = r.minutesIntoBar > s.minMinutesIntoBar;
    let barTimingOk = if (earlyBar) { r.touchDepthRatio >= p90 } else { lateBar };
    if (not barTimingOk) { return #noTrade };

    // MTF alignment: lower TFs (1m, 3m, 5m) must align against the 1h trend
    // for snapback, or with it for push-through.
    let isLowerTf = r.timeframe == "1" or r.timeframe == "3" or r.timeframe == "5";
    let bias = switch (htfBias.get(r.asset)) {
      case (?b) b;
      case null #neutral;
    };
    let mtfAligned = if (isLowerTf) {
      switch (bias) {
        case (#bullish) r.shortSnapback or r.pushThrough; // long setups after a pullback to lower band, or ride upper
        case (#bearish) r.longSnapback or r.pushThrough; // short setups after a rally to upper band, or ride lower
        case (#neutral) true; // no filter when no clear bias
      };
    } else { true };

    // ── Snapback (mean reversion) ──────────────────────────────────────
    // Requires a first touch with a deep pierce (high touchDepthRatio),
    // RSI divergence context (oversold for long, overbought for short),
    // and bandWidth above its MA (avoid the chop).
    if (isFirstTouch and bandWidthAboveMa) {
      if (r.longSnapback and r.rsi <= s.rsiOversold and mtfAligned) {
        return #snapbackLong;
      };
      if (r.shortSnapback and r.rsi >= s.rsiOverbought and mtfAligned) {
        return #snapbackShort;
      };
    };

    // ── Push Through (momentum continuation) ──────────────────────────
    // Requires pushThrough flag, RSI embedded (>= 80 long, <= 20 short),
    // and bandWidth expanding from a below-average state (squeeze breakout).
    if (r.pushThrough and bandWidthExpanding) {
      if (r.rsi >= s.rsiEmbedHigh and mtfAligned) {
        return #pushThroughLong;
      };
      if (r.rsi <= s.rsiEmbedLow and mtfAligned) {
        return #pushThroughShort;
      };
    };

    #noTrade;
  };

  // Higher-timeframe directional bias, derived from the push-through regime
  // on the 15m and 1h timeframes for each asset.
  private type HTFBias = { #bullish; #bearish; #neutral };

  private func computeHtfBias(rows : [SignalRow]) : Map.Map<Text, HTFBias> {
    let perAsset = Map.empty<Text, { var bull : Nat; var bear : Nat }>();
    for (r in rows.values()) {
      if (r.timeframe == "15" or r.timeframe == "60") {
        if (r.pushThrough) {
          let entry = switch (perAsset.get(r.asset)) {
            case (?e) e;
            case null {
              let e = { var bull = 0; var bear = 0 };
              perAsset.add(r.asset, e);
              e;
            };
          };
          // Upper-band push through with high RSI = bullish; lower-band with
          // low RSI = bearish. We approximate direction from RSI embedding.
          if (r.rsi >= 60.0) { entry.bull := entry.bull + 1 };
          if (r.rsi <= 40.0) { entry.bear := entry.bear + 1 };
        };
      };
    };
    let result = Map.empty<Text, HTFBias>();
    for ((asset, counts) in perAsset.entries()) {
      let bias = if (counts.bull > counts.bear) { #bullish } else if (counts.bear > counts.bull) { #bearish } else { #neutral };
      result.add(asset, bias);
    };
    result;
  };

  // Simple rolling moving average of bandWidth per (asset, timeframe) group.
  // Returns an array aligned with `rows`.
  private func computeBandWidthMa(rows : [SignalRow], window : Nat) : [Float] {
    let n = rows.size();
    let result = Array.tabulate(n, func _ = 0.0).toVarArray();
    if (n == 0 or window == 0) { return Array.fromVarArray(result) };

    // Group indices by (asset, timeframe).
    let groups = Map.empty<Text, [Nat]>();
    for ((idx, r) in rows.enumerate()) {
      let key = r.asset # "|" # r.timeframe;
      let existing = groups.get(key);
      let updated = switch (existing) {
        case (?arr) arr.concat([idx]);
        case null [idx];
      };
      groups.add(key, updated);
    };

    for ((key, indices) in groups.entries()) {
      let w = Float.fromInt(window);
      var i = 0;
      var runningSum = 0.0;
      while (i < indices.size()) {
        let rowIdx = indices[i];
        let bw = rows[rowIdx].bandWidth;
        runningSum := runningSum + bw;
        if (i >= window) {
          let oldIdx = indices[i - window];
          runningSum := runningSum - rows[oldIdx].bandWidth;
          result[rowIdx] := runningSum / w;
        } else if (i + 1 >= window) {
          result[rowIdx] := runningSum / w;
        } else {
          // Not enough data yet — use the partial average.
          result[rowIdx] := runningSum / Float.fromInt(i + 1);
        };
        i := i + 1;
      };
    };

    Array.fromVarArray(result);
  };

  // 90th percentile of touchDepthRatio per (asset, timeframe) group.
  private func computeTouchDepthRatioP90(rows : [SignalRow]) : Map.Map<Text, Float> {
    let groups = Map.empty<Text, [Float]>();
    for (r in rows.values()) {
      if (not r.alertId.isEmpty()) {
        let key = r.asset # "|" # r.timeframe;
        let existing = groups.get(key);
        let updated = switch (existing) {
          case (?arr) arr.concat([r.touchDepthRatio]);
          case null [r.touchDepthRatio];
        };
        groups.add(key, updated);
      };
    };
    let result = Map.empty<Text, Float>();
    for ((key, values) in groups.entries()) {
      let sorted = values.sort();
      let n = sorted.size();
      let p90 = if (n == 0) {
        100.0;
      } else {
        let idx = (n * 90) / 100;
        let safeIdx = if (idx >= n) { n - 1 } else { idx };
        sorted[safeIdx];
      };
      result.add(key, p90);
    };
    result;
  };

  // ───────────────────────────────────────────────────────────────────────
  // Full strategy pipeline
  // ───────────────────────────────────────────────────────────────────────
  // Re-run the full strategy pipeline (basis, RSI, classification) over a
  // dataset's raw rows with the given settings. The order matters: basis
  // derivation is independent, RSI needs closes only, and classification
  // needs both RSI and basis available on each row.
  public func runStrategy(rows : [SignalRow], settings : Settings) : [SignalRow] {
    let withBasis = deriveBasis(rows);
    let withRsi = computeRsi(withBasis, settings.rsiPeriod);
    classifySignals(withRsi, settings);
  };

  // ───────────────────────────────────────────────────────────────────────
  // Default settings
  // ───────────────────────────────────────────────────────────────────────
  // RSI length matched to BB length (9), not the default 14.
  public func defaultSettings() : Settings {
    {
      rsiPeriod = 9;
      bbLength = 9;
      bbStdDev = 2.0;
      rsiOverbought = 70.0;
      rsiOversold = 30.0;
      rsiEmbedHigh = 80.0;
      rsiEmbedLow = 20.0;
      minMinutesIntoBar = 0.85;
      minBandWidthRatio = 1.0;
    };
  };
};
