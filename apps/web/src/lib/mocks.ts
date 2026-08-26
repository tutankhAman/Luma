import type {
  AiExplainResponse,
  AuditTrailResponse,
  BatchSummary,
  ExceptionDetail,
  ExceptionListItem,
  GetBatchResponse,
  LoanDetail,
  Severity,
  SummaryResponse,
  UploadBatch,
  VerifiedLoanListResponse,
} from "@repo/types";

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

const now = Date.now();
const iso = (minutesAgo: number): string =>
  new Date(now - minutesAgo * 60_000).toISOString();

const batch: GetBatchResponse = {
  createdAt: iso(42),
  failedCount: 12,
  failedRows: [
    {
      rawData:
        ",,2023-01-15,2053-01-15,250000,,5.99,360,TX,purchase,B,,,,current,0",
      reason: "Empty loan_id and borrower_id",
      rowNumber: 45,
    },
    {
      rawData:
        "L-10088,B-5088,2022-11-02,bad_date,180000,175000,7.1,240,FL,refi,A,5,75k-100k,current,0",
      reason: "Invalid maturity date format",
      rowNumber: 128,
    },
    {
      rawData:
        "L-10131,B-5131,2024-03-30,2024-01-01,90000,91000,12.5,120,ZZ,other,D,1,<25k,late,45",
      reason: "Maturity before origination; invalid state code ZZ",
      rowNumber: 301,
    },
  ],
  fileName: "loan_tape.csv",
  fileType: "loan_tape",
  id: "clx_batch_001",
  recordCount: 1000,
  status: "done",
};

const batches: UploadBatch[] = [
  { ...batch },
  {
    createdAt: iso(60 * 26),
    failedCount: 0,
    fileName: "servicer_update.csv",
    fileType: "servicer_update",
    id: "clx_batch_002",
    recordCount: 640,
    status: "done",
  },
  {
    createdAt: iso(18),
    failedCount: 0,
    fileName: "document_manifest.csv",
    fileType: "document_manifest",
    id: "clx_batch_003",
    processedCount: 340,
    recordCount: 1024,
    status: "processing",
  },
];

const summary: BatchSummary = {
  batchId: "clx_batch_001",
  exceptionsBySeverity: {
    critical: 75,
    high: 91,
    low: 20,
    medium: 60,
  } satisfies Record<Severity, number>,
  exceptionsByType: {
    balance_error: 41,
    conflicting_source: 0,
    date_error: 22,
    duplicate: 34,
    invalid_state: 12,
    missing_field: 89,
    rate_out_of_range: 18,
    stale_record: 15,
    status_inconsistency: 27,
  },
  failedValidation: 246,
  passedValidation: 742,
  totalImported: 988,
};

const loanRef = {
  borrowerId: "B-5001",
  id: "clx_loan_001",
  loanId: "L-10001",
  validationStatus: "failed",
};

const exceptions: ExceptionListItem[] = [
  {
    aiRecommendation: null,
    createdAt: iso(95),
    exceptionType: "balance_error",
    field: "currentBalance",
    id: "clx_exc_001",
    loan: loanRef,
    message: "Current balance (400000) exceeds original principal (350000)",
    severity: "critical",
    status: "open",
  },
  {
    aiRecommendation: null,
    createdAt: iso(94),
    exceptionType: "conflicting_source",
    field: "currentBalance",
    id: "clx_exc_002",
    loan: loanRef,
    message:
      "Servicer update shows balance 340000 which conflicts with loan tape value 400000",
    severity: "high",
    status: "open",
  },
  {
    aiRecommendation: null,
    createdAt: iso(90),
    exceptionType: "missing_field",
    field: "documentStatus",
    id: "clx_exc_003",
    loan: {
      borrowerId: "B-5120",
      id: "clx_loan_042",
      loanId: "L-10120",
      validationStatus: "failed",
    },
    message: "Required field documentStatus is missing",
    severity: "high",
    status: "open",
  },
  {
    aiRecommendation: null,
    createdAt: iso(88),
    exceptionType: "duplicate",
    field: "loanId",
    id: "clx_exc_004",
    loan: {
      borrowerId: "B-5088",
      id: "clx_loan_088",
      loanId: "L-10088",
      validationStatus: "review",
    },
    message: "Duplicate loan ID L-10088 found in rows 128 and 402",
    severity: "critical",
    status: "open",
  },
  {
    aiRecommendation: null,
    createdAt: iso(80),
    exceptionType: "stale_record",
    field: "lastUpdatedAt",
    id: "clx_exc_005",
    loan: {
      borrowerId: "B-5210",
      id: "clx_loan_210",
      loanId: "L-10210",
      validationStatus: "failed",
    },
    message: "Record last updated 143 days ago (>90 day threshold)",
    severity: "low",
    status: "open",
  },
  {
    aiRecommendation: null,
    createdAt: iso(76),
    exceptionType: "status_inconsistency",
    field: "paymentStatus",
    id: "clx_exc_006",
    loan: {
      borrowerId: "B-5155",
      id: "clx_loan_155",
      loanId: "L-10155",
      validationStatus: "review",
    },
    message: "Payment status 'closed' but currentBalance is positive (12500)",
    severity: "medium",
    status: "open",
  },
  {
    aiRecommendation: null,
    createdAt: iso(200),
    exceptionType: "rate_out_of_range",
    field: "interestRate",
    id: "clx_exc_007",
    loan: {
      borrowerId: "B-5002",
      id: "clx_loan_002",
      loanId: "L-10002",
      validationStatus: "passed",
    },
    message: "Interest rate 44.2% outside expected range [0%, 40%]",
    severity: "high",
    status: "approved",
  },
];

const exceptionDetail: ExceptionDetail = {
  aiRecommendation: null,
  correctedValue: null,
  createdAt: iso(95),
  exceptionType: "balance_error",
  field: "currentBalance",
  id: "clx_exc_001",
  loan: { id: "clx_loan_001", loanId: "L-10001" },
  message: "Current balance (400000) exceeds original principal (350000)",
  reviewedAt: null,
  reviewerId: null,
  reviewerNote: null,
  severity: "critical",
  status: "open",
  updatedAt: iso(95),
};

const aiExplain: AiExplainResponse = {
  exceptionId: "clx_exc_001",
  recommendation: {
    confidence: 0.87,
    fieldsToChange: [
      {
        currentValue: "400000",
        field: "currentBalance",
        source: "servicer_update",
        suggestedValue: "340000",
      },
    ],
    model: "gemini-2.0-flash",
    promptSummary: "Balance conflict resolution for loan L-10001",
    reasoning:
      "The servicer update file (uploaded 2026-08-20) shows a balance of 340000 for loan L-10001. The original loan tape value of 400000 predates the servicer update and likely reflects the balance before recent payments were processed.",
    suggestion: "Set currentBalance to 340000",
    timestamp: iso(35),
  },
};

const summaryOverview: SummaryResponse = {
  exceptionsBySeverity: { critical: 187, high: 224, low: 70, medium: 160 },
  exceptionsByType: {
    balance_error: 103,
    conflicting_source: 25,
    date_error: 54,
    duplicate: 89,
    invalid_state: 12,
    missing_field: 212,
    rate_out_of_range: 45,
    stale_record: 42,
    status_inconsistency: 71,
  },
  overview: {
    openExceptions: 247,
    qualityScore: 63.1,
    totalBatches: 3,
    totalExceptions: 641,
    totalLoansImported: 2856,
    verifiedLoans: 1802,
  },
  recentActivity: [
    {
      actor: "Reviewer User",
      eventType: "VERIFIED_RECORD_CREATED",
      loanId: "L-10001",
      timestamp: iso(10),
    },
    {
      actor: "Reviewer User",
      eventType: "LOAN_APPROVED",
      loanId: "L-10002",
      timestamp: iso(48),
    },
    {
      actor: null,
      eventType: "EXCEPTION_CREATED",
      loanId: "L-10120",
      timestamp: iso(90),
    },
    {
      actor: "Operator User",
      eventType: "FILE_UPLOADED",
      loanId: null,
      timestamp: iso(120),
    },
  ],
};

const loanDetail: LoanDetail = {
  borrowerId: "B-5001",
  borrowerState: "CA",
  creditGrade: "A",
  currentBalance: "400000.00",
  daysPastDue: 0,
  documentStatus: "complete",
  employmentLength: "5-10 years",
  exceptions: [
    {
      aiRecommendation: null,
      createdAt: iso(95),
      exceptionType: "balance_error",
      field: "currentBalance",
      id: "clx_exc_001",
      message: "Current balance (400000) exceeds original principal (350000)",
      severity: "critical",
      status: "open",
    },
    {
      aiRecommendation: null,
      createdAt: iso(94),
      exceptionType: "conflicting_source",
      field: "currentBalance",
      id: "clx_exc_002",
      message:
        "Servicer update shows balance 340000 which conflicts with loan tape value 400000",
      severity: "high",
      status: "open",
    },
  ],
  id: "clx_loan_001",
  importStatus: "imported",
  incomeBand: "100k-150k",
  interestRate: "6.75",
  lastPaymentDate: iso(60 * 24 * 25),
  lastUpdatedAt: iso(60 * 24 * 6),
  loanId: "L-10001",
  loanPurpose: "purchase",
  loanType: "mortgage",
  maturityDate: iso(-60 * 24 * 365 * 26),
  originalPrincipal: "350000.00",
  originationDate: iso(60 * 24 * 365 * 4),
  paymentStatus: "current",
  servicerName: "First National",
  sourceBatch: { fileName: "loan_tape.csv", id: "clx_batch_001" },
  sourceRowNumber: 3,
  sourceSystem: "origination",
  termMonths: 360,
  validationStatus: "failed",
  verifiedRecord: null,
};

const auditTrail: AuditTrailResponse = {
  data: [
    {
      actor: {
        id: "clx_user_op",
        name: "Operator User",
        role: "data_operator",
      },
      createdAt: iso(60 * 26),
      eventType: "LOAN_IMPORTED",
      id: "clx_log_001",
      metadata: {
        batchId: "clx_batch_001",
        fileName: "loan_tape.csv",
        sourceRowNumber: 3,
      },
    },
    {
      actor: null,
      createdAt: iso(95),
      eventType: "EXCEPTION_CREATED",
      id: "clx_log_002",
      metadata: {
        exceptionId: "clx_exc_001",
        exceptionType: "balance_error",
        field: "currentBalance",
        severity: "critical",
      },
    },
    {
      actor: { id: "clx_user_rev", name: "Reviewer User", role: "reviewer" },
      createdAt: iso(35),
      eventType: "AI_RECOMMENDATION",
      id: "clx_log_003",
      metadata: {
        confidence: 0.87,
        exceptionId: "clx_exc_001",
        model: "gemini-2.0-flash",
        promptSummary: "Balance conflict resolution for loan L-10001",
      },
    },
    {
      actor: { id: "clx_user_rev", name: "Reviewer User", role: "reviewer" },
      createdAt: iso(20),
      eventType: "REVIEWER_COMMENT",
      id: "clx_log_004",
      metadata: {
        exceptionId: "clx_exc_001",
        note: "Cross-checking balance against servicer update.",
      },
    },
  ],
  loanId: "clx_loan_001",
  pagination: { limit: 50, page: 1, total: 4, totalPages: 1 },
};

const verifiedLoans: VerifiedLoanListResponse = {
  data: [
    {
      aiRecommendationUsed: true,
      id: "clx_vl_001",
      loan: { borrowerId: "B-5001", loanId: "L-10001" },
      loanId: "clx_loan_001",
      recordHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      reviewerDecision: "approved_with_edits",
      sourceBatchRef: "loan_tape.csv (clx_batch_001)",
      validationResult: "passed_with_review",
      verifiedAt: iso(10),
      verifiedById: "clx_user_reviewer",
    },
    {
      aiRecommendationUsed: false,
      id: "clx_vl_002",
      loan: { borrowerId: "B-5002", loanId: "L-10002" },
      loanId: "clx_loan_002",
      recordHash:
        "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
      reviewerDecision: "approved",
      sourceBatchRef: "loan_tape.csv (clx_batch_001)",
      validationResult: "passed",
      verifiedAt: iso(48),
      verifiedById: "clx_user_reviewer",
    },
  ],
  pagination: { limit: 20, page: 1, total: 742, totalPages: 38 },
  qualityScore: 75.1,
};

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

export const mockApi = {
  aiExplain: (): Promise<AiExplainResponse> =>
    delay(structuredClone(aiExplain), 900),
  auditTrail: (loanId: string): Promise<AuditTrailResponse> =>
    delay({ ...structuredClone(auditTrail), loanId }),
  batch: (batchId: string): Promise<GetBatchResponse> =>
    delay(
      structuredClone(
        batches.find((item) => item.id === batchId) ?? batches[0]
      ) as GetBatchResponse
    ),
  batches: (): Promise<{ data: UploadBatch[] }> =>
    delay({ data: structuredClone(batches) }),
  exceptionDetail: (): Promise<ExceptionDetail> =>
    delay(structuredClone(exceptionDetail)),
  exceptions: (): Promise<{ data: ExceptionListItem[] }> =>
    delay({ data: structuredClone(exceptions) }),
  loanDetail: (loanId: string): Promise<LoanDetail> =>
    delay({ ...structuredClone(loanDetail), id: loanId }),
  summary: (): Promise<SummaryResponse> =>
    delay(structuredClone(summaryOverview)),
  upload: (): Promise<{ batchId: string; message: string }> =>
    delay({
      batchId: "clx_batch_003",
      message: "File uploaded. Processing has started.",
    }),
  uploadSummary: (batchId: string): Promise<BatchSummary> =>
    delay({ ...structuredClone(summary), batchId }),
  verifiedLoans: (): Promise<VerifiedLoanListResponse> =>
    delay(structuredClone(verifiedLoans)),
};
