import type { BatchStatus, FileType } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadsApi } from "@/lib/api";

export function useUploads(page = 1, status?: BatchStatus) {
  return useQuery({
    queryFn: () => uploadsApi.list({ limit: 20, page, status }),
    queryKey: ["uploads", page, status],
  });
}

export function useUploadBatch(batchId: string) {
  return useQuery({
    enabled: Boolean(batchId),
    queryFn: () => uploadsApi.detail(batchId),
    queryKey: ["uploads", batchId],
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ? 1500 : false,
  });
}

export function useUploadBatchSummary(batchId: string, isProcessing = false) {
  return useQuery({
    enabled: Boolean(batchId),
    queryFn: () => uploadsApi.summary(batchId),
    queryKey: ["uploads", batchId, "summary"],
    refetchInterval: isProcessing ? 1500 : false,
  });
}

export interface CreateUploadVariables {
  file: File;
  fileType: FileType;
  onProgress?: (percent: number) => void;
}

export function useCreateUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, fileType, onProgress }: CreateUploadVariables) =>
      uploadsApi.create(file, fileType, onProgress),
    onError: (error: Error) => {
      toast.error("Upload failed", { description: error.message });
    },
    onSuccess: (result) => {
      toast.success(result.message ?? "Upload started");
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    },
  });
}
