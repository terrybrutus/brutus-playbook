import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Option "mo:core/Option";
import Runtime "mo:core/Runtime";
import Storage "mo:caffeineai-object-storage/Storage";
import Text "mo:core/Text";
import Time "mo:core/Time";
import DatasetsLib "../lib/datasets";
import Types "../types/datasets";

mixin (
  datasets : DatasetsLib.Datasets,
  settings : { var current : Types.Settings },
  nextId : { var value : Types.DatasetId }
) {
  // Upload a CSV file. The file itself is stored via the object-storage
  // extension (Storage.ExternalBlob); parsed rows + computed signals are
  // persisted in canister stable storage. The strategy pipeline runs
  // immediately on upload using the current settings.
  public shared ({ caller }) func uploadDataset (
    name : Text,
    file : Storage.ExternalBlob
  ) : async Types.DatasetId {
    ignore caller;
    // Decode the CSV blob to text.
    let csvText = switch (file.decodeUtf8()) {
      case (?t) t;
      case null Runtime.trap("uploadDataset: file is not valid UTF-8");
    };
    // Parse + run the strategy pipeline.
    let rawRows = DatasetsLib.parseCsv(csvText);
    let signalRows = DatasetsLib.runStrategy(rawRows, settings.current);

    let id = nextId.value;
    nextId.value := id + 1;
    let dataset : Types.Dataset = {
      id;
      name;
      file;
      uploadedAt = Int.abs(Time.now());
      rows = signalRows;
    };
    datasets.add(id, dataset);
    id;
  };

  // Fetch a dataset (metadata + parsed rows + computed signals).
  public query func getDataset (id : Types.DatasetId) : async ?Types.Dataset {
    datasets.get<Types.DatasetId, Types.Dataset>(id);
  };

  // Fetch only the parsed rows + computed signals for a given dataset.
  public query func getDatasetRows (id : Types.DatasetId) : async ?[Types.SignalRow] {
    switch (datasets.get<Types.DatasetId, Types.Dataset>(id)) {
      case (?d) ?d.rows;
      case null null;
    };
  };

  // List all stored datasets (metadata + rows; the data-viewer extension
  // handles pagination of large datasets separately).
  public query func listDatasets () : async [Types.Dataset] {
    datasets.entries().toArray().map<(Types.DatasetId, Types.Dataset), Types.Dataset>(
      func(_id, d) = d,
    );
  };

  // Update strategy settings and re-run the strategy over all stored
  // datasets so the frontend sees refreshed signalType classifications.
  public shared ({ caller }) func updateSettings (
    newSettings : Types.Settings
  ) : async () {
    ignore caller;
    settings.current := newSettings;
    // Re-run the strategy over every stored dataset's rows.
    for ((id, dataset) in datasets.entries()) {
      // Re-parse from the stored file to get fresh raw rows, then re-run.
      let csvText = switch (dataset.file.decodeUtf8()) {
        case (?t) t;
        case null Runtime.trap("updateSettings: stored file is not valid UTF-8");
      };
      let rawRows = DatasetsLib.parseCsv(csvText);
      let signalRows = DatasetsLib.runStrategy(rawRows, newSettings);
      datasets.add(
        id,
        { dataset with rows = signalRows },
      );
    };
  };

  // Get the current strategy settings.
  public query func getSettings () : async Types.Settings {
    settings.current;
  };
};
