import Map "mo:core/Map";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import DatasetsLib "lib/datasets";
import DatasetsApi "mixins/datasets-api";
import Types "types/datasets";

actor {
  include MixinViews();
  include MixinObjectStorage();

  let datasets : DatasetsLib.Datasets;
  let settings : { var current : Types.Settings };
  let nextId : { var value : Types.DatasetId };

  include DatasetsApi(datasets, settings, nextId);
};
