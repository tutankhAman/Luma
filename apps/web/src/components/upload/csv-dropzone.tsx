import type { FileType } from "@repo/types";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUpload } from "@/hooks/use-uploads";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 500 * 1024 * 1024;
const FILE_TYPES: FileType[] = [
  "loan_tape",
  "servicer_update",
  "document_manifest",
];

export function CsvDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [fileType, setFileType] = useState<FileType>("loan_tape");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const createUpload = useCreateUpload();

  const validateAndSet = (candidate: File | undefined) => {
    if (!candidate) {
      return;
    }
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only .csv files are supported");
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      toast.error("File too large", {
        description: "Maximum size is 500 MB.",
      });
      return;
    }
    setFile(candidate);
  };

  const startUpload = () => {
    if (!file || createUpload.isPending) {
      return;
    }
    setProgress(0);
    createUpload.mutate(
      { file, fileType, onProgress: setProgress },
      {
        onError: () => setProgress(null),
        onSuccess: (result) => {
          setFile(null);
          setProgress(null);
          const input = inputRef.current;
          if (input instanceof HTMLInputElement) {
            input.value = "";
          }
          navigate(`/operator/uploads/${result.batchId}`);
        },
      }
    );
  };

  const openPicker = () => {
    inputRef.current?.click();
  };

  return (
    <Card className="rounded-2xl border-slate-100 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <i
            aria-hidden="true"
            className="ri-upload-cloud-2-line text-indigo-500 text-lg"
          />
          Upload loan data
        </CardTitle>
        <CardDescription className="text-slate-500">
          Max size 500 MB — ingestion runs in the background and you can track
          progress per batch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          aria-label="Upload CSV file"
          className={cn(
            "flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-slate-200 border-dashed bg-slate-50/50 p-8 text-center transition-colors",
            dragging
              ? "border-indigo-300 bg-indigo-50/50"
              : "hover:border-indigo-300 hover:bg-indigo-50/50"
          )}
          onClick={openPicker}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            validateAndSet(event.dataTransfer.files[0]);
          }}
          type="button"
        >
          <i
            aria-hidden="true"
            className="ri-upload-cloud-2-line text-3xl text-indigo-500"
          />
          {file ? (
            <>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-muted-foreground text-xs">
                {(file.size / 1024 / 1024).toFixed(2)} MB — click to replace
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-sm">
                Drag &amp; drop your CSV here, or click to browse
              </p>
              <p className="text-muted-foreground text-xs">.csv files only</p>
            </>
          )}
          <input
            accept=".csv"
            aria-label="Choose CSV file"
            className="sr-only"
            onChange={(event) => validateAndSet(event.target.files?.[0])}
            ref={inputRef}
            type="file"
          />
        </button>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Label className="text-slate-500" htmlFor="file-type">
              File type
            </Label>
            <Select
              onValueChange={(value) => setFileType(value as FileType)}
              value={fileType}
            >
              <SelectTrigger className="w-52" id="file-type" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="ml-auto rounded-lg bg-indigo-600 px-6 text-white hover:bg-indigo-700"
            disabled={!file || createUpload.isPending}
            onClick={startUpload}
          >
            {createUpload.isPending ? (
              <>
                <i
                  aria-hidden="true"
                  className="ri-loader-4-line animate-spin text-base"
                />
                Uploading...
              </>
            ) : (
              <>
                <i aria-hidden="true" className="ri-upload-2-line text-base" />
                Start ingestion
              </>
            )}
          </Button>
        </div>

        {progress === null ? null : (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-right text-muted-foreground text-xs tabular-nums">
              {progress}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
