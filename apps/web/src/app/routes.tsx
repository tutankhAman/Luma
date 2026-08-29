import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { Layout } from "./layout";
import {
  ConsumerLayout,
  OperatorLayout,
  ReviewerLayout,
  SharedDocLayout,
} from "./layouts/role-layouts";
import ApiExplorerPage from "./pages/consumer/api-explorer";
import AuditTrailPage from "./pages/consumer/audit";
import ConsumerDashboard from "./pages/consumer/dashboard";
import ExportPage from "./pages/consumer/export";
import ConsumerLoanDetailPage from "./pages/consumer/loan-detail";
import VerifiedRecordsPage from "./pages/consumer/verified";
import LoginPageDefault, { RoleRedirect } from "./pages/login";
import BatchDetailPage from "./pages/operator/batch-detail";
import OperatorDashboard from "./pages/operator/dashboard";
import ImportHistoryPage from "./pages/operator/imports";
import LoanRecordsPage from "./pages/operator/loans";
import UploadPage from "./pages/operator/upload";
import ReviewerDashboard from "./pages/reviewer/dashboard";
import ExceptionQueuePage from "./pages/reviewer/exceptions";
import LoanDetailPage from "./pages/reviewer/loan-detail";
import RuleBuilderPage from "./pages/reviewer/rules";
import AiDevelopmentLogPage from "./pages/shared/ai-development-log";
import ArchitecturePage from "./pages/shared/architecture";

const LoginPage = LoginPageDefault;

export const routes: RouteObject[] = [
  {
    children: [
      { element: <RoleRedirect />, index: true },
      { element: <LoginPage />, path: "login" },
      {
        children: [
          { element: <AiDevelopmentLogPage />, path: "ai-log" },
          { element: <ArchitecturePage />, path: "architecture" },
        ],
        element: <SharedDocLayout />,
      },
      {
        children: [
          {
            element: <Navigate replace to="/operator/dashboard" />,
            index: true,
          },
          { element: <OperatorDashboard />, path: "dashboard" },
          { element: <UploadPage />, path: "upload" },
          { element: <ImportHistoryPage />, path: "imports" },
          { element: <LoanRecordsPage />, path: "loans" },
          { element: <LoanRecordsPage />, path: "loans/:id" },
          { element: <BatchDetailPage />, path: "uploads/:batchId" },
        ],
        element: <OperatorLayout />,
        path: "operator",
      },
      {
        children: [
          {
            element: <Navigate replace to="/reviewer/dashboard" />,
            index: true,
          },
          { element: <ReviewerDashboard />, path: "dashboard" },
          { element: <ExceptionQueuePage />, path: "exceptions" },
          { element: <RuleBuilderPage />, path: "rules" },
          { element: <LoanDetailPage />, path: "loans/:id" },
        ],
        element: <ReviewerLayout />,
        path: "reviewer",
      },
      {
        children: [
          {
            element: <Navigate replace to="/consumer/dashboard" />,
            index: true,
          },
          { element: <ConsumerDashboard />, path: "dashboard" },
          { element: <VerifiedRecordsPage />, path: "verified" },
          { element: <ConsumerLoanDetailPage />, path: "loans/:id" },
          { element: <AuditTrailPage />, path: "audit" },
          { element: <AuditTrailPage />, path: "audit/:loanId" },
          { element: <ApiExplorerPage />, path: "api" },
          { element: <ExportPage />, path: "export" },
        ],
        element: <ConsumerLayout />,
        path: "consumer",
      },
    ],
    element: <Layout />,
  },
];
