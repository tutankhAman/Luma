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
    <Card className="rounded-[24px] border border-zinc-200/60 bg-[#18181B] shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.03),0px_4px_8px_-2px_rgba(0,0,0,0.02)]">
      <CardHeader className="p-8 pb-0">
        <CardTitle className="font-medium text-lg text-zinc-900 tracking-tight">
          Upload loan data
        </CardTitle>
        <CardDescription className="mt-1 text-zinc-500">
          Max size 500 MB — ingestion runs in the background and you can track
          progress per batch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 p-8 pt-5">
        <button
          aria-label="Upload CSV file"
          className={cn(
            "group flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed p-8 text-center transition-all duration-200",
            dragging
              ? "border-zinc-400 bg-zinc-100"
              : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-50"
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
            className="ri-upload-cloud-2-line mb-3 text-4xl text-zinc-400 transition-colors group-hover:text-zinc-600"
          />
          {file ? (
            <>
              <p className="font-medium text-sm text-zinc-900">{file.name}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB — click to replace
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-sm text-zinc-600">
                Drag &amp; drop your CSV here, or click to browse
              </p>
              <p className="mt-1 text-xs text-zinc-400">.csv files only</p>
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

        <div className="mt-6 flex items-center justify-between gap-3 border-zinc-100 border-t pt-6">
          <div className="flex flex-col justify-center space-y-1.5">
            <Label
              className="font-medium text-xs text-zinc-500 uppercase tracking-wider"
              htmlFor="file-type"
            >
              File type
            </Label>
            <Select
              onValueChange={(value) => setFileType(value as FileType)}
              value={fileType}
            >
              <SelectTrigger
                className="w-52 rounded-lg border-zinc-200 shadow-sm"
                id="file-type"
                size="sm"
              >
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
            className="ml-auto rounded-lg bg-zinc-900 px-8 font-medium text-white shadow-sm transition-all hover:bg-zinc-800"
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
              <>Start ingestion</>
            )}
          </Button>
        </div>

        {progress === null ? null : (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-right text-[#A1A1AA] text-xs tabular-nums">
              {progress}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
