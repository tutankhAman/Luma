import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { Layout } from "./layout";
import {
  ConsumerLayout,
  OperatorLayout,
  ReviewerLayout,
} from "./layouts/role-layouts";
import ConsumerDashboard from "./pages/consumer/dashboard";
import ExportPage from "./pages/consumer/export";
import LoginPageDefault, { RoleRedirect } from "./pages/login";

const LoginPage = LoginPageDefault;

import BatchDetailPage from "./pages/operator/batch-detail";
import OperatorDashboard from "./pages/operator/dashboard";
import ReviewerDashboard from "./pages/reviewer/dashboard";
import ExceptionQueuePage from "./pages/reviewer/exceptions";
import {
  ConsumerVerifiedLoanDetail,
  ReviewerLoanDetail,
} from "./pages/shared/loan-detail-placeholder";

export const routes: RouteObject[] = [
  {
    children: [
      { element: <RoleRedirect />, index: true },
      { element: <LoginPage />, path: "login" },
      {
        children: [
          {
            element: <Navigate replace to="/operator/dashboard" />,
            index: true,
          },
          { element: <OperatorDashboard />, path: "dashboard" },
          { element: <BatchDetailPage />, path: "uploads/:batchId" },
        ],
        element: <OperatorLayout />,
        path: "operator",
      },
      {
        children: [
          {
            element: <Navigate replace to="/reviewer/exceptions" />,
            index: true,
          },
          { element: <ReviewerDashboard />, path: "dashboard" },
          { element: <ExceptionQueuePage />, path: "exceptions" },
          { element: <ReviewerLoanDetail />, path: "loans/:id" },
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
          { element: <ConsumerVerifiedLoanDetail />, path: "loans/:id" },
          { element: <ExportPage />, path: "export" },
        ],
        element: <ConsumerLayout />,
        path: "consumer",
      },
    ],
    element: <Layout />,
  },
];
