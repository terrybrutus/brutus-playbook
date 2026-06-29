import { ExternalBlob } from "@/backend";
import { Button } from "@/components/ui/button";
import { useUploadDataset } from "@/lib/backendHooks";
import { parseAlertCsv } from "@/lib/csvParser";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { FileUp, Loader2, Play, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Dataset loader control row.
 *
 * Surfaces three actions:
 *  - Load sample dataset (one-click fetch of the shipped CSV)
 *  - Upload CSV (file picker -> parse -> loadRows)
 *  - Clear dataset (resets the store)
 *
 * Shows a loading state on the sample button while the fetch is in flight and
 * surfaces parse errors via a toast. Used both in the empty state and the
 * loaded-state header.
 */

interface DatasetLoaderProps {
  /** Compact variant for the loaded-state header. */
  compact?: boolean;
}

export function DatasetLoader({ compact = false }: DatasetLoaderProps) {
  const loadSampleDataset = useAppStore((s) => s.loadSampleDataset);
  const loadRows = useAppStore((s) => s.loadRows);
  const clearDataset = useAppStore((s) => s.clearDataset);
  const isLoading = useAppStore((s) => s.isLoading);
  const hasDataset = useAppStore((s) => s.rows.length > 0);
  const uploadDataset = useUploadDataset();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleLoadSample() {
    await loadSampleDataset();
    const err = useAppStore.getState().error;
    if (err) {
      toast.error("Sample load failed", { description: err });
    } else {
      toast.success("Sample dataset loaded", {
        description: "TradingView alerts parsed and classified.",
      });
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const result = parseAlertCsv(text);
      // Parse and display locally immediately (non-blocking UX).
      loadRows(result.rows, result.warnings, result.skipped, file.name);
      if (result.rows.length === 0) {
        toast.warning("No rows parsed", {
          description: `CSV "${file.name}" yielded 0 rows. Check the format.`,
        });
      } else {
        toast.success("Dataset uploaded", {
          description: `${result.rows.length} rows parsed from ${file.name}.`,
        });
      }

      // Persist the file to backend object-storage in the background.
      // Non-blocking: a failure here warns the user but does NOT undo the
      // local parse — the user can still analyze the dataset on-device.
      try {
        const bytes = new TextEncoder().encode(text);
        const blob = ExternalBlob.fromBytes(bytes as Uint8Array<ArrayBuffer>);
        await uploadDataset.mutateAsync({ name: file.name, file: blob });
      } catch (uploadErr) {
        toast.warning("Saved locally only", {
          description:
            uploadErr instanceof Error
              ? `Backend persist failed: ${uploadErr.message}`
              : "Backend persist failed; dataset kept locally.",
        });
      }
    } catch (err) {
      toast.error("Upload failed", {
        description:
          err instanceof Error ? err.message : "Could not read file.",
      });
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const busy = isLoading || uploading || uploadDataset.isPending;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact ? "" : "justify-center",
      )}
    >
      <Button
        type="button"
        variant="default"
        onClick={handleLoadSample}
        disabled={busy}
        data-ocid="dashboard.load_sample_button"
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
        Load sample dataset
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleUploadClick}
        disabled={busy}
        data-ocid="dashboard.upload_button"
        className="gap-2"
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileUp className="size-4" aria-hidden="true" />
        )}
        Upload CSV
      </Button>

      {hasDataset ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            clearDataset();
            toast("Dataset cleared");
          }}
          disabled={busy}
          data-ocid="dashboard.clear_button"
          className="gap-2"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Clear
        </Button>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Upload CSV file"
        data-ocid="dashboard.upload_input"
      />
    </div>
  );
}
