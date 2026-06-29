import Storage "mo:caffeineai-object-storage/Storage";
import Common "common";

module {
  public type Asset = Common.Asset;
  public type Timeframe = Common.Timeframe;
  public type DatasetId = Common.DatasetId;
  public type Timestamp = Common.Timestamp;

  // A single parsed row from a CSV alert log, with computed signals.
  public type SignalRow = {
    alertId : Text;
    ticker : Text;
    name : Text;
    time : Text;
    asset : Asset;
    timeframe : Timeframe;
    open : Float;
    high : Float;
    low : Float;
    close : Float;
    bbUpper : Float;
    bbLower : Float;
    bbBasis : Float; // derived: (upper + lower) / 2
    bandWidth : Float;
    touchDepth : Float;
    touchDepthRatio : Float;
    longSnapback : Bool;
    shortSnapback : Bool;
    pushThrough : Bool;
    minutesIntoBar : Float;
    inSession : Bool;
    rsi : Float; // computed: 9-period RSI matched to BB length
    decisionEvent : Text; // e.g. "first_touch"
    mode : Text;
    signalType : SignalType; // classified from raw indicator data
  };

  // Strategy classification derived from raw indicator data (NOT the script's
  // SKIP/DO NOT HOLD action logic). Educational paper-analysis only.
  public type SignalType = {
    #snapbackLong;
    #snapbackShort;
    #pushThroughLong;
    #pushThroughShort;
    #noTrade;
  };

  // A stored dataset: the uploaded CSV file plus its parsed rows + signals.
  public type Dataset = {
    id : DatasetId;
    name : Text;
    file : Storage.ExternalBlob;
    uploadedAt : Timestamp;
    rows : [SignalRow];
  };

  // User-tunable strategy settings. Re-running the strategy applies these to
  // the stored raw rows and recomputes signalType per row.
  public type Settings = {
    rsiPeriod : Nat; // matched to BB length (default 9)
    bbLength : Nat; // default 9
    bbStdDev : Float; // default 2.0
    rsiOverbought : Float; // default 70
    rsiOversold : Float; // default 30
    rsiEmbedHigh : Float; // default 80 (push-through long)
    rsiEmbedLow : Float; // default 20 (push-through short)
    minMinutesIntoBar : Float; // default 0.85 (last 15% of candle)
    minBandWidthRatio : Float; // default 1.0 (bandWidth above its moving avg)
  };
};
