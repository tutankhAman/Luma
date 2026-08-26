import type { BatchStatus, FileType } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadsApi } from "@/lib/api";
import { mockApi, USE_MOCKS } from "@/lib/mocks";

export function useUploads(page = 1, status?: BatchStatus) {
  return useQuery({
    queryFn: async () => {
      if (USE_MOCKS) {
        const { data } = await mockApi.batches();
        return {
          data: data.filter((item) => !status || item.status === status),
          pagination: { limit: 20, page: 1, total: data.length, totalPages: 1 },
        };
      }
      return uploadsApi.list({ limit: 20, page, status });
    },
    queryKey: ["uploads", page, status],
  });
}

export function useUploadBatch(batchId: string) {
  return useQuery({
    queryFn: () =>
      USE_MOCKS ? mockApi.batch(batchId) : uploadsApi.detail(batchId),
    queryKey: ["uploads", batchId],
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ? 2000 : false,
  });
}

export function useUploadBatchSummary(batchId: string) {
  return useQuery({
    enabled: Boolean(batchId),
    queryFn: () =>
      USE_MOCKS ? mockApi.uploadSummary(batchId) : uploadsApi.summary(batchId),
    queryKey: ["uploads", batchId, "summary"],
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
    mutationFn: async ({
      file,
      fileType,
      onProgress,
    }: CreateUploadVariables) => {
      if (USE_MOCKS) {
        for (const percent of [15, 45, 75, 100]) {
          onProgress?.(percent);
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        return mockApi.upload();
      }
      return uploadsApi.create(file, fileType, onProgress);
    },
    onError: (error: Error) => {
      toast.error("Upload failed", { description: error.message });
    },
    onSuccess: (result) => {
      toast.success(result.message ?? "Upload started");
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}
