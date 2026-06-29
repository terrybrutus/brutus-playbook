import Map "mo:core/Map";
import DatasetsLib "../lib/datasets";
import Types "../types/datasets";

module {
  type OldActor = {};
  type NewActor = {
    datasets : DatasetsLib.Datasets;
    settings : { var current : Types.Settings };
    nextId : { var value : Types.DatasetId };
  };

  public func migration(old : OldActor) : NewActor {
    {
      datasets = Map.empty<Types.DatasetId, Types.Dataset>();
      settings = { var current = DatasetsLib.defaultSettings() };
      nextId = { var value = 0 };
    };
  };
};
