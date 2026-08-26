# Luma — API Contract
## REST API Reference

**Base URL:** `http://localhost:4000` (dev) / `https://api.luma.app` (prod)  
**Auth:** Cookie-based sessions via Better Auth. All protected endpoints require a valid session cookie.  
**Content-Type:** `application/json` (except file upload endpoints: `multipart/form-data`)  
**Error format:**
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "fields": { "fieldName": "validation message" }  // only on 400 Zod errors
}
```

---

## Table of Contents

1. [Auth](#1-auth)
2. [Uploads — Ingestion](#2-uploads--ingestion)
3. [Loans](#3-loans)
4. [Exceptions](#4-exceptions)
5. [AI Assistant](#5-ai-assistant)
6. [Verified Loans](#6-verified-loans)
7. [Audit Trail](#7-audit-trail)
8. [Summary & Dashboard](#8-summary--dashboard)

---

## 1. Auth

Auth endpoints are handled entirely by **Better Auth** and mounted at `/api/auth/*`. No custom code.

### `POST /api/auth/sign-in/email`
Sign in with email + password.

**Body:**
```json
{
  "email": "operator@luma.dev",
  "password": "password"
}
```

**Response `200`:**
```json
{
  "token": null,
  "user": {
    "id": "clx...",
    "name": "Operator User",
    "email": "operator@luma.dev",
    "role": "data_operator",
    "emailVerified": false,
    "createdAt": "2026-08-01T00:00:00.000Z",
    "updatedAt": "2026-08-01T00:00:00.000Z"
  }
}
```
Sets `better-auth.session_token` HTTP-only cookie.

**Errors:**
- `401` — Invalid credentials

---

### `POST /api/auth/sign-out`
Sign out and clear session cookie.

**Response `200`:** `{ "success": true }`

---

### `GET /api/auth/get-session`
Retrieve the current session. Used by web `authClient.getSession()` (Vite — `better-auth` `createAuthClient`).

**Response `200`:**
```json
{
  "session": {
    "id": "sess_...",
    "expiresAt": "2026-09-01T00:00:00.000Z",
    "userId": "clx..."
  },
  "user": {
    "id": "clx...",
    "name": "Reviewer User",
    "email": "reviewer@luma.dev",
    "role": "reviewer"
  }
}
```

**Response `401`:** `{ "error": "Unauthorized" }` (no active session)

---

### `GET /api/auth/ok`
Health check for the auth server.

**Response `200`:** `{ "ok": true }`

---

## 2. Uploads — Ingestion

### `POST /api/uploads`
Upload a CSV file and start ingestion.

**Role:** `data_operator`  
**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | File | Yes | `.csv` only, max 500 MB (~1.5M rows) — matches backend multer limit |
| `fileType` | string | Yes | `loan_tape` \| `servicer_update` \| `document_manifest` |

**Response `202`:**
```json
{
  "batchId": "clx_batch_001",
  "fileName": "loan_tape.csv",
  "fileType": "loan_tape",
  "status": "processing",
  "message": "File uploaded. Processing has started."
}
```

**Errors:**
- `400` — Missing file or invalid fileType
- `415` — Not a CSV file
- `413` — File too large

---

### `GET /api/uploads`
List all upload batches for the current operator.

**Role:** `data_operator`

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | `1` | |
| `limit` | number | `20` | max 100 |
| `status` | string | — | `pending` \| `processing` \| `done` \| `failed` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "clx_batch_001",
      "fileName": "loan_tape.csv",
      "fileType": "loan_tape",
      "status": "done",
      "recordCount": 1000,
      "failedCount": 12,
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### `GET /api/uploads/:batchId`
Get a single batch's status and details.

**Role:** `data_operator`

**Response `200`:**
```json
{
  "id": "clx_batch_001",
  "fileName": "loan_tape.csv",
  "fileType": "loan_tape",
  "status": "done",
  "recordCount": 1000,
  "failedCount": 12,
  "createdAt": "2026-08-25T10:00:00.000Z",
  "failedRows": [
    {
      "rowNumber": 45,
      "rawData": ",,2023-01-01,...",
      "reason": "Completely empty loan_id and borrower_id"
    }
  ]
}
```

---

### `GET /api/uploads/:batchId/summary`
Get validation summary for a completed batch.

**Role:** `data_operator`

**Response `200`:**
```json
{
  "batchId": "clx_batch_001",
  "totalImported": 988,
  "passedValidation": 742,
  "failedValidation": 246,
  "exceptionsByType": {
    "missing_field": 89,
    "duplicate": 34,
    "date_error": 22,
    "balance_error": 41,
    "rate_out_of_range": 18,
    "status_inconsistency": 27,
    "stale_record": 15,
    "conflicting_source": 0,
    "invalid_state": 12
  },
  "exceptionsBySeverity": {
    "critical": 75,
    "high": 91,
    "medium": 60,
    "low": 20
  }
}
```

---

## 3. Loans

### `GET /api/loans`
List all loans with optional filters.

**Role:** `data_operator` | `reviewer`

**Query params:**
| Param | Type | Notes |
|---|---|---|
| `page` | number | default `1` |
| `limit` | number | default `20`, max `100` |
| `batchId` | string | filter by upload batch |
| `validationStatus` | string | `pending` \| `passed` \| `failed` \| `review` |
| `search` | string | search by `loanId` or `borrowerId` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "clx_loan_001",
      "loanId": "L-10001",
      "borrowerId": "B-5001",
      "validationStatus": "failed",
      "loanType": "mortgage",
      "originalPrincipal": "350000.00",
      "currentBalance": "342000.00",
      "interestRate": "6.75",
      "paymentStatus": "current",
      "borrowerState": "CA",
      "exceptionCount": 2,
      "sourceRowNumber": 3,
      "sourceBatch": {
        "id": "clx_batch_001",
        "fileName": "loan_tape.csv"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 988, "totalPages": 50 }
}
```

---

### `GET /api/loans/:id`
Get full loan detail including exceptions and audit history.

**Role:** `data_operator` | `reviewer` | `data_consumer` (verified only)

**Response `200`:**
```json
{
  "id": "clx_loan_001",
  "loanId": "L-10001",
  "borrowerId": "B-5001",
  "sourceBatch": { "id": "clx_batch_001", "fileName": "loan_tape.csv" },
  "sourceRowNumber": 3,
  "loanType": "mortgage",
  "originationDate": "2022-03-15T00:00:00.000Z",
  "maturityDate": "2052-03-15T00:00:00.000Z",
  "originalPrincipal": "350000.00",
  "currentBalance": "342000.00",
  "interestRate": "6.75",
  "termMonths": 360,
  "borrowerState": "CA",
  "loanPurpose": "purchase",
  "creditGrade": "A",
  "employmentLength": "5-10 years",
  "incomeBand": "100k-150k",
  "paymentStatus": "current",
  "daysPastDue": 0,
  "servicerName": "First National",
  "lastPaymentDate": "2026-08-01T00:00:00.000Z",
  "lastUpdatedAt": "2026-08-20T00:00:00.000Z",
  "documentStatus": "complete",
  "sourceSystem": "origination",
  "validationStatus": "failed",
  "importStatus": "imported",
  "exceptions": [
    {
      "id": "clx_exc_001",
      "exceptionType": "balance_error",
      "severity": "high",
      "field": "currentBalance",
      "message": "Current balance (400000) exceeds original principal (350000)",
      "status": "open",
      "aiRecommendation": null,
      "createdAt": "2026-08-25T10:05:00.000Z"
    }
  ],
  "verifiedRecord": null
}
```

---

### `PATCH /api/loans/:id/fields`
Edit allowed fields on a loan record (reviewer only). Triggers audit log.

**Role:** `reviewer`

**Body:**
```json
{
  "fields": {
    "currentBalance": "340000",
    "paymentStatus": "current",
    "borrowerState": "CA"
  },
  "reason": "Correcting balance per servicer update document"
}
```

**Allowed editable fields:** `currentBalance`, `interestRate`, `paymentStatus`, `documentStatus`, `borrowerState`, `servicerName`, `creditGrade`

**Response `200`:**
```json
{
  "id": "clx_loan_001",
  "updatedFields": ["currentBalance"],
  "updatedAt": "2026-08-25T11:00:00.000Z"
}
```

**Errors:**
- `400` — Attempting to edit a non-editable field (e.g., `loanId`, `originationDate`)
- `403` — Not a reviewer

---

### `POST /api/loans/:id/verify`
Create a verified loan record once all exceptions are resolved.

**Role:** `reviewer`

**Body:** `{}` (no body required)

**Response `201`:**
```json
{
  "verifiedLoan": {
    "id": "clx_vl_001",
    "loanId": "clx_loan_001",
    "recordHash": "e3b0c44298fc1c149afbf4c8996fb924...",
    "verifiedAt": "2026-08-25T12:00:00.000Z",
    "verifiedById": "clx_user_reviewer",
    "validationResult": "passed_with_review"
  }
}
```

**Errors:**
- `409` — One or more exceptions are still `open`
- `409` — Verified record already exists for this loan

---

## 4. Exceptions

### `GET /api/exceptions`
List exceptions with filters. Primary view for the Reviewer queue.

**Role:** `reviewer`

**Query params:**
| Param | Type | Notes |
|---|---|---|
| `page` | number | default `1` |
| `limit` | number | default `20`, max `100` |
| `status` | string | `open` \| `approved` \| `rejected` \| `corrected` |
| `severity` | string | `critical` \| `high` \| `medium` \| `low` |
| `type` | string | `missing_field` \| `duplicate` \| `date_error` \| `balance_error` \| `rate_out_of_range` \| `status_inconsistency` \| `stale_record` \| `conflicting_source` \| `invalid_state` |
| `search` | string | matches `loan.loanId` or `loan.borrowerId` |
| `batchId` | string | filter by upload batch |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "clx_exc_001",
      "exceptionType": "balance_error",
      "severity": "high",
      "field": "currentBalance",
      "message": "Current balance (400000) exceeds original principal (350000)",
      "status": "open",
      "aiRecommendation": null,
      "loan": {
        "id": "clx_loan_001",
        "loanId": "L-10001",
        "borrowerId": "B-5001",
        "validationStatus": "failed"
      },
      "createdAt": "2026-08-25T10:05:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 246, "totalPages": 13 }
}
```

---

### `GET /api/exceptions/:id`
Get a single exception with full context.

**Role:** `reviewer`

**Response `200`:**
```json
{
  "id": "clx_exc_001",
  "exceptionType": "balance_error",
  "severity": "high",
  "field": "currentBalance",
  "message": "Current balance (400000) exceeds original principal (350000)",
  "status": "open",
  "reviewerId": null,
  "reviewedAt": null,
  "reviewerNote": null,
  "correctedValue": null,
  "aiRecommendation": {
    "suggestion": "Set currentBalance to 340000",
    "reasoning": "Servicer update file shows balance of 340000 as of 2026-08-01. Original tape appears stale.",
    "confidence": 0.87,
    "fieldsToChange": [{ "field": "currentBalance", "suggestedValue": "340000" }],
    "model": "gemini-2.0-flash",
    "promptSummary": "Loan L-10001 balance conflict resolution",
    "timestamp": "2026-08-25T11:30:00.000Z"
  },
  "loan": {
    "id": "clx_loan_001",
    "loanId": "L-10001"
  },
  "createdAt": "2026-08-25T10:05:00.000Z",
  "updatedAt": "2026-08-25T11:30:00.000Z"
}
```

---

### `POST /api/exceptions/:id/comment`
Add a reviewer comment to an exception.

**Role:** `reviewer`

**Body:**
```json
{
  "note": "Verified against servicer update — balance discrepancy confirmed. Using servicer value."
}
```

**Response `200`:**
```json
{
  "id": "clx_exc_001",
  "reviewerNote": "Verified against servicer update — balance discrepancy confirmed. Using servicer value.",
  "updatedAt": "2026-08-25T11:45:00.000Z"
}
```

---

### `POST /api/exceptions/:id/approve`
Approve an exception (mark it resolved as-is or after correction).

**Role:** `reviewer`

**Body:**
```json
{
  "note": "Balance verified, correction applied.",
  "correctedValue": "340000"
}
```

**Response `200`:**
```json
{
  "id": "clx_exc_001",
  "status": "approved",
  "reviewedAt": "2026-08-25T11:50:00.000Z",
  "reviewerId": "clx_user_reviewer"
}
```

---

### `POST /api/exceptions/:id/reject`
Reject a loan record exception (loan cannot be verified).

**Role:** `reviewer`

**Body:**
```json
{
  "note": "Unable to resolve — source data is corrupt. Loan must be re-submitted."
}
```

**Response `200`:**
```json
{
  "id": "clx_exc_001",
  "status": "rejected",
  "reviewedAt": "2026-08-25T11:55:00.000Z"
}
```

---

### `POST /api/exceptions/:id/decision`
Record reviewer's response to an AI recommendation (accept / edit / reject the AI suggestion).

**Role:** `reviewer`

**Body:**
```json
{
  "decision": "accepted",
  "editedValue": null
}
```

| Field | Values |
|---|---|
| `decision` | `accepted` \| `edited` \| `rejected` |
| `editedValue` | string \| null — required when decision is `edited` |

**Response `200`:**
```json
{
  "exceptionId": "clx_exc_001",
  "aiDecision": "accepted",
  "recordedAt": "2026-08-25T11:52:00.000Z"
}
```

---

## 5. AI Assistant

### `POST /api/ai/explain`
Ask the AI to explain why a specific exception occurred and suggest a correction.

**Role:** `reviewer`

**Body:**
```json
{
  "exceptionId": "clx_exc_001"
}
```

**Response `200`:**
```json
{
  "exceptionId": "clx_exc_001",
  "recommendation": {
    "suggestion": "Set currentBalance to 340000",
    "reasoning": "The servicer update file (uploaded 2026-08-20) shows a balance of 340,000 for loan L-10001. The original loan tape value of 400,000 predates the servicer update and likely reflects the balance before recent payments were processed.",
    "confidence": 0.87,
    "fieldsToChange": [
      {
        "field": "currentBalance",
        "currentValue": "400000",
        "suggestedValue": "340000",
        "source": "servicer_update"
      }
    ],
    "model": "gemini-2.0-flash",
    "promptSummary": "Balance conflict resolution for loan L-10001",
    "timestamp": "2026-08-25T11:30:00.000Z"
  }
}
```

**Errors:**
- `404` — Exception not found
- AI unavailable: never `500` — returns `{ exceptionId, recommendation: null, error: "AI unavailable" }` with `200` (uniform graceful fallback for all AI routes; see §5 graceful-degradation note below — api-contract's `503` line is superseded)

---

### `POST /api/ai/summarize-batch`
Generate a natural-language summary of all open exceptions in a batch.

**Role:** `reviewer`

**Body:**
```json
{
  "batchId": "clx_batch_001"
}
```

**Response `200`:**
```json
{
  "batchId": "clx_batch_001",
  "summary": "This batch of 988 loans contains 246 validation exceptions. The most common issue is missing or invalid current balance (41 cases), followed by duplicate loan ID detection (34 cases). 75 exceptions are classified as critical severity and require immediate reviewer attention. Key patterns: 22 loans have maturity dates before origination dates, likely due to a date format mismatch in the source system. 15 loans are flagged as stale (last updated > 90 days ago).",
  "model": "gemini-2.0-flash",
  "timestamp": "2026-08-25T11:35:00.000Z"
}
```

---

### `POST /api/ai/classify-severity`
Ask the AI to re-evaluate the severity of an exception.

**Role:** `reviewer`

**Body:**
```json
{
  "exceptionId": "clx_exc_001"
}
```

**Response `200`:**
```json
{
  "exceptionId": "clx_exc_001",
  "currentSeverity": "high",
  "suggestedSeverity": "critical",
  "reasoning": "A current balance exceeding original principal by 14% indicates potential fraud or a system error that could materially affect downstream analytics. This warrants critical classification.",
  "model": "gemini-2.0-flash",
  "timestamp": "2026-08-25T11:38:00.000Z"
}
```

---

### `POST /api/ai/suggest-rule`
Generate a validation rule from a natural language description.

**Role:** `data_operator` | `reviewer`

**Body:**
```json
{
  "prompt": "Flag any loan where the credit grade is A or B but the interest rate is above 12%"
}
```

**Response `200`:**
```json
{
  "rule": {
    "id": "ai_rule_001",
    "name": "credit_grade_rate_mismatch",
    "description": "Flag loans where credit grade is A or B with interest rate above 12%",
    "condition": {
      "field": "interestRate",
      "operator": "gt",
      "value": 12,
      "when": { "field": "creditGrade", "operator": "in", "value": ["A", "B"] }
    },
    "severity": "high",
    "exceptionType": "rate_out_of_range"
  },
  "model": "gemini-2.0-flash",
  "promptSummary": "Credit grade / rate mismatch rule",
  "timestamp": "2026-08-25T11:40:00.000Z",
  "note": "This rule was AI-generated. Review before applying to production validation."
}
```

**Graceful degradation (all AI routes):** Gemini failure never returns `500`. Every AI response schema has a nullable primary payload + optional `error: string` (e.g., `recommendation: null + error: "AI unavailable"` on explain, `summary: null + error: ...` on summarize, `suggestedSeverity: null + reasoning: null + error ...` on classify, `rule: null + error ...` on suggest-rule) with `200`. A 503-era line in the Errors table is an historical draft — `200 + error field` is the auditable contract A builds against.

---

## 6. Verified Loans

### `GET /api/verified-loans`
List all verified loan records. Primary view for Data Consumers.

**Role:** `data_consumer` | `reviewer`

**Query params:**
| Param | Type | Notes |
|---|---|---|
| `page` | number | default `1` |
| `limit` | number | default `20`, max `100` |
| `validationResult` | string | `passed` \| `passed_with_review` |
| `aiRecommendationUsed` | boolean | filter by whether AI was used |
| `search` | string | search by `loan.loanId` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "clx_vl_001",
      "loanId": "clx_loan_001",
      "loan": { "loanId": "L-10001", "borrowerId": "B-5001" },
      "sourceBatchRef": "loan_tape.csv (clx_batch_001)",
      "validationResult": "passed_with_review",
      "reviewerDecision": "approved_with_edits",
      "aiRecommendationUsed": true,
      "verifiedById": "clx_user_reviewer",
      "verifiedAt": "2026-08-25T12:00:00.000Z",
      "recordHash": "e3b0c44298fc1c149afbf4c8996fb924..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 742, "totalPages": 38 },
  "qualityScore": 75.1
}
```

---

### `GET /api/verified-loans/:id`
Get a single verified loan with full canonical data.

**Role:** `data_consumer` | `reviewer`

**Response `200`:**
```json
{
  "id": "clx_vl_001",
  "loanId": "clx_loan_001",
  "canonicalData": {
    "loanId": "L-10001",
    "borrowerId": "B-5001",
    "loanType": "mortgage",
    "originationDate": "2022-03-15",
    "maturityDate": "2052-03-15",
    "originalPrincipal": "350000.00",
    "currentBalance": "340000.00",
    "interestRate": "6.75",
    "termMonths": 360,
    "borrowerState": "CA",
    "loanPurpose": "purchase",
    "creditGrade": "A",
    "employmentLength": "5-10 years",
    "incomeBand": "100k-150k",
    "paymentStatus": "current",
    "daysPastDue": 0,
    "servicerName": "First National",
    "lastPaymentDate": "2026-08-01",
    "documentStatus": "complete",
    "sourceSystem": "origination"
  },
  "sourceBatchRef": "loan_tape.csv (clx_batch_001)",
  "validationResult": "passed_with_review",
  "reviewerDecision": "approved_with_edits",
  "aiRecommendationUsed": true,
  "verifiedById": "clx_user_reviewer",
  "verifiedAt": "2026-08-25T12:00:00.000Z",
  "recordHash": "e3b0c44298fc1c149afbf4c8996fb924..."
}
```

---

### `GET /api/verified-loans/export`
Export all verified loans as CSV.

**Role:** `data_consumer`

**Query params:**
| Param | Type | Notes |
|---|---|---|
| `batchId` | string | optional, filter by batch |

**Response `200`:**  
`Content-Type: text/csv`  
`Content-Disposition: attachment; filename="verified_loans_2026-08-25.csv"`

CSV columns: all `canonicalData` fields + `verifiedAt`, `recordHash`, `validationResult`

**Triggers:** `AuditLog: RECORD_EXPORTED`

---

## 7. Audit Trail

### `GET /api/audit/:loanId`
Get the full audit trail for a single loan.

**Role:** `data_consumer` | `reviewer` | `data_operator`

**Query params:**
| Param | Type | Notes |
|---|---|---|
| `page` | number | default `1` |
| `limit` | number | default `50` |

**Response `200`:**
```json
{
  "loanId": "clx_loan_001",
  "data": [
    {
      "id": "clx_log_001",
      "eventType": "LOAN_IMPORTED",
      "actor": { "id": "clx_user_op", "name": "Operator User", "role": "data_operator" },
      "metadata": {
        "sourceRowNumber": 3,
        "batchId": "clx_batch_001",
        "fileName": "loan_tape.csv"
      },
      "createdAt": "2026-08-25T10:01:00.000Z"
    },
    {
      "id": "clx_log_002",
      "eventType": "EXCEPTION_CREATED",
      "actor": null,
      "metadata": {
        "exceptionId": "clx_exc_001",
        "exceptionType": "balance_error",
        "severity": "high",
        "field": "currentBalance"
      },
      "createdAt": "2026-08-25T10:05:00.000Z"
    },
    {
      "id": "clx_log_003",
      "eventType": "AI_RECOMMENDATION",
      "actor": { "id": "clx_user_rev", "name": "Reviewer User", "role": "reviewer" },
      "metadata": {
        "exceptionId": "clx_exc_001",
        "model": "gemini-2.0-flash",
        "promptSummary": "Balance conflict resolution for loan L-10001",
        "confidence": 0.87,
        "timestamp": "2026-08-25T11:30:00.000Z"
      },
      "createdAt": "2026-08-25T11:30:00.000Z"
    },
    {
      "id": "clx_log_004",
      "eventType": "FIELD_EDITED",
      "actor": { "id": "clx_user_rev", "name": "Reviewer User", "role": "reviewer" },
      "metadata": {
        "field": "currentBalance",
        "oldValue": "400000",
        "newValue": "340000",
        "reason": "Correcting balance per servicer update document"
      },
      "createdAt": "2026-08-25T11:45:00.000Z"
    },
    {
      "id": "clx_log_005",
      "eventType": "LOAN_APPROVED",
      "actor": { "id": "clx_user_rev", "name": "Reviewer User", "role": "reviewer" },
      "metadata": {
        "exceptionId": "clx_exc_001",
        "note": "Balance verified, correction applied."
      },
      "createdAt": "2026-08-25T11:50:00.000Z"
    },
    {
      "id": "clx_log_006",
      "eventType": "VERIFIED_RECORD_CREATED",
      "actor": { "id": "clx_user_rev", "name": "Reviewer User", "role": "reviewer" },
      "metadata": {
        "verifiedLoanId": "clx_vl_001",
        "recordHash": "e3b0c44298fc1c149afbf4c8996fb924...",
        "validationResult": "passed_with_review"
      },
      "createdAt": "2026-08-25T12:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 6, "totalPages": 1 }
}
```

---

## 8. Summary & Dashboard

### `GET /api/summary`
Global stats for the dashboard widgets.

**Role:** All authenticated users (data filtered by role)

**Response `200`:**
```json
{
  "overview": {
    "totalBatches": 3,
    "totalLoansImported": 2856,
    "totalExceptions": 641,
    "openExceptions": 247,
    "verifiedLoans": 1802,
    "qualityScore": 63.1
  },
  "exceptionsByType": {
    "missing_field": 212,
    "duplicate": 89,
    "date_error": 54,
    "balance_error": 103,
    "rate_out_of_range": 45,
    "status_inconsistency": 71,
    "stale_record": 42,
    "conflicting_source": 25
  },
  "exceptionsBySeverity": {
    "critical": 187,
    "high": 224,
    "medium": 160,
    "low": 70
  },
  "recentActivity": [
    {
      "eventType": "VERIFIED_RECORD_CREATED",
      "actor": "Reviewer User",
      "loanId": "L-10001",
      "timestamp": "2026-08-25T12:00:00.000Z"
    }
  ]
}
```

---

## Appendix A — Event Types

| Event Type | Triggered By | Description |
|---|---|---|
| `FILE_UPLOADED` | Operator | CSV file received and stored |
| `LOAN_IMPORTED` | System | Chunk of loan rows parsed and stored (count + row range in metadata; one event per chunk, not per row) |
| `VALIDATION_RUN` | System | Validation engine executed for a batch |
| `EXCEPTION_CREATED` | System | A validation rule failure was recorded |
| `AI_RECOMMENDATION` | Reviewer (triggers AI) | AI generated a recommendation for an exception |
| `REVIEWER_COMMENT` | Reviewer | Comment added to an exception |
| `FIELD_EDITED` | Reviewer | A loan field was manually edited |
| `LOAN_APPROVED` | Reviewer | An exception was approved (resolved) |
| `LOAN_REJECTED` | Reviewer | An exception was rejected (unresolvable) |
| `VERIFIED_RECORD_CREATED` | Reviewer | All exceptions closed; verified record created |
| `RECORD_EXPORTED` | Consumer | Verified records CSV downloaded |

---

## Appendix B — Exception Types

| Type | Description | Severity Guidance |
|---|---|---|
| `missing_field` | Required field is null or empty | `high` (loan_id: `critical`) |
| `duplicate` | Duplicate loan ID, or repeated borrower + amount + origination-date combo, or suspiciously repeated borrower records | `critical` |
| `date_error` | Invalid date format, or maturity < origination | `high` |
| `balance_error` | Negative principal, or current > original | `critical` |
| `rate_out_of_range` | Interest rate < 0% or > 40% | `high` |
| `status_inconsistency` | Payment status conflicts with days past due, or closed loan still showing positive balance | `medium` |
| `stale_record` | `last_updated_at` > 90 days ago | `low` |
| `invalid_state` | `borrower_state` not a valid US state code | `medium` |
| `conflicting_source` | Field value differs between loan_tape and servicer_update | `high` |

---

## Appendix C — HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `202` | Accepted (async job started) |
| `400` | Validation error (Zod) — `fields` map included |
| `401` | Unauthenticated — no valid session |
| `403` | Forbidden — wrong role |
| `404` | Resource not found |
| `409` | Conflict — e.g., verified record already exists |
| `413` | Payload too large |
| `415` | Unsupported media type |
| `500` | Internal server error |
| `503` | AI service temporarily unavailable |
