import type {
  AiClassifySeverityResponse,
  AiExplainResponse,
  AiSuggestRuleResponse,
  AiSummarizeBatchResponse,
  AuditListQuery,
  AuditTrailResponse,
  BatchSummary,
  CreateUploadResponse,
  ExceptionApproveBody,
  ExceptionCommentBody,
  ExceptionDecisionBody,
  ExceptionDecisionResponse,
  ExceptionDetail,
  ExceptionListItem,
  FileType,
  GetBatchResponse,
  HealthResponse,
  LoanDetail,
  LoanFieldsPatchBody,
  LoanFieldsPatchResponse,
  LoanListItem,
  LoanListQuery,
  LoanVerifyResponse,
  PaginationQuery,
  SummaryResponse,
  UploadBatch,
  VerifiedLoanDetail,
  VerifiedLoanListQuery,
  VerifiedLoanListResponse,
} from "@repo/types";
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export interface ApiErrorPayload {
  code?: string;
  error?: string;
  fields?: Record<string, string>;
}

function toApiError(error: unknown): Error & ApiErrorPayload {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorPayload | undefined;
    const err = new Error(
      data?.error ?? error.message ?? "Request failed"
    ) as Error & ApiErrorPayload;
    err.code = data?.code;
    err.fields = data?.fields;
    return err;
  }
  return error instanceof Error ? error : new Error(String(error));
}

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error))
);

export interface Paginated<T> {
  data: T[];
  pagination: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

export const healthApi = {
  check: async (): Promise<HealthResponse> => {
    const { data } = await api.get<HealthResponse>("/health");
    return data;
  },
};

export const uploadsApi = {
  create: async (
    file: File,
    fileType: FileType,
    onProgress?: (percent: number) => void
  ): Promise<CreateUploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    form.append("fileType", fileType);
    const { data } = await api.post<CreateUploadResponse>("/uploads", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!(onProgress && event.total)) {
          return;
        }
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data;
  },
  detail: async (batchId: string): Promise<GetBatchResponse> => {
    const { data } = await api.get<GetBatchResponse>(`/uploads/${batchId}`);
    return data;
  },
  list: async (query: PaginationQuery & { status?: string }) => {
    const { data } = await api.get<Paginated<UploadBatch>>("/uploads", {
      params: query,
    });
    return data;
  },
  summary: async (batchId: string): Promise<BatchSummary> => {
    const { data } = await api.get<BatchSummary>(`/uploads/${batchId}/summary`);
    return data;
  },
};

export const loansApi = {
  detail: async (id: string): Promise<LoanDetail> => {
    const { data } = await api.get<LoanDetail>(`/loans/${id}`);
    return data;
  },
  list: async (query: LoanListQuery) => {
    const { data } = await api.get<Paginated<LoanListItem>>("/loans", {
      params: query,
    });
    return data;
  },
  patchFields: async (
    id: string,
    body: LoanFieldsPatchBody
  ): Promise<LoanFieldsPatchResponse> => {
    const { data } = await api.patch<LoanFieldsPatchResponse>(
      `/loans/${id}/fields`,
      body
    );
    return data;
  },
  verify: async (id: string): Promise<LoanVerifyResponse> => {
    const { data } = await api.post<LoanVerifyResponse>(`/loans/${id}/verify`);
    return data;
  },
};

export const exceptionsApi = {
  approve: async (
    id: string,
    body: ExceptionApproveBody
  ): Promise<Partial<ExceptionDetail>> => {
    const { data } = await api.post<Partial<ExceptionDetail>>(
      `/exceptions/${id}/approve`,
      body
    );
    return data;
  },
  comment: async (
    id: string,
    body: ExceptionCommentBody
  ): Promise<ExceptionDetail> => {
    const { data } = await api.post<ExceptionDetail>(
      `/exceptions/${id}/comment`,
      body
    );
    return data;
  },
  detail: async (id: string): Promise<ExceptionDetail> => {
    const { data } = await api.get<ExceptionDetail>(`/exceptions/${id}`);
    return data;
  },
  list: async (
    query: Partial<{
      batchId: string;
      search: string;
      severity: string;
      status: string;
      type: string;
    }> &
      PaginationQuery
  ) => {
    const { data } = await api.get<Paginated<ExceptionListItem>>(
      "/exceptions",
      { params: query }
    );
    return data;
  },
  recordAiDecision: async (
    id: string,
    body: ExceptionDecisionBody
  ): Promise<ExceptionDecisionResponse> => {
    const { data } = await api.post<ExceptionDecisionResponse>(
      `/exceptions/${id}/decision`,
      body
    );
    return data;
  },
  reject: async (
    id: string,
    note: string
  ): Promise<Partial<ExceptionDetail>> => {
    const { data } = await api.post<Partial<ExceptionDetail>>(
      `/exceptions/${id}/reject`,
      { note }
    );
    return data;
  },
};

export const aiApi = {
  classifySeverity: async (
    exceptionId: string
  ): Promise<AiClassifySeverityResponse> => {
    const { data } = await api.post<AiClassifySeverityResponse>(
      "/ai/classify-severity",
      { exceptionId }
    );
    return data;
  },
  explain: async (exceptionId: string): Promise<AiExplainResponse> => {
    const { data } = await api.post<AiExplainResponse>("/ai/explain", {
      exceptionId,
    });
    return data;
  },
  suggestRule: async (prompt: string): Promise<AiSuggestRuleResponse> => {
    const { data } = await api.post<AiSuggestRuleResponse>("/ai/suggest-rule", {
      prompt,
    });
    return data;
  },
  summarizeBatch: async (
    batchId: string
  ): Promise<AiSummarizeBatchResponse> => {
    const { data } = await api.post<AiSummarizeBatchResponse>(
      "/ai/summarize-batch",
      { batchId }
    );
    return data;
  },
};

export const verifiedLoansApi = {
  detail: async (id: string): Promise<VerifiedLoanDetail> => {
    const { data } = await api.get<VerifiedLoanDetail>(`/verified-loans/${id}`);
    return data;
  },
  exportCsv: (batchId?: string): string =>
    batchId
      ? `/api/verified-loans/export?batchId=${encodeURIComponent(batchId)}`
      : "/api/verified-loans/export",
  list: async (
    query: VerifiedLoanListQuery
  ): Promise<VerifiedLoanListResponse> => {
    const { data } = await api.get<VerifiedLoanListResponse>(
      "/verified-loans",
      { params: query }
    );
    return data;
  },
};

export const auditApi = {
  trail: async (loanId: string, query?: AuditListQuery) => {
    const { data } = await api.get<AuditTrailResponse>(`/audit/${loanId}`, {
      params: query,
    });
    return data;
  },
};

export const summaryApi = {
  get: async (): Promise<SummaryResponse> => {
    const { data } = await api.get<SummaryResponse>("/summary");
    return data;
  },
};
