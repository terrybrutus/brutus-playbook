import {
  type Dataset,
  type DatasetId,
  type ExternalBlob,
  type Settings,
  type SignalRow,
  createActor,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * TanStack Query hooks wrapping the backend actor.
 * The actor is obtained via useActor(createActor) from core-infrastructure.
 */

/** List all datasets stored on the backend. */
export function useListDatasets() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Dataset[]>({
    queryKey: ["datasets"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDatasets();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Fetch the parsed signal rows for a single dataset. */
export function useGetDatasetRows(id: DatasetId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<SignalRow[] | null>({
    queryKey: ["dataset-rows", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getDatasetRows(id);
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}

/** Fetch the persisted backend settings. */
export function useGetSettings() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!actor) {
        throw new Error("Backend actor not available.");
      }
      return actor.getSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Upload a new dataset (CSV bytes) to the backend. */
export function useUploadDataset() {
  const queryClient = useQueryClient();
  const { actor, isFetching } = useActor(createActor);
  return useMutation<DatasetId, Error, { name: string; file: ExternalBlob }>({
    mutationFn: async ({ name, file }) => {
      if (!actor || isFetching) {
        throw new Error("Backend actor not available.");
      }
      return actor.uploadDataset(name, file);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
  });
}

/** Persist updated settings to the backend. */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { actor, isFetching } = useActor(createActor);
  return useMutation<void, Error, Settings>({
    mutationFn: async (newSettings) => {
      if (!actor || isFetching) {
        throw new Error("Backend actor not available.");
      }
      await actor.updateSettings(newSettings);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
