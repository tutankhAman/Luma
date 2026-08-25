import { Navigate, type RouteObject } from "react-router-dom";
import { Layout } from "./layout";

const Placeholder = ({ label }: { label: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center p-8">
    <p className="text-muted-foreground text-sm">
      {label} — coming in next milestones
    </p>
  </div>
);

export const routes: RouteObject[] = [
  {
    children: [
      { element: <Navigate replace to="/login" />, index: true },
      { element: <Placeholder label="Login" />, path: "login" },
      {
        children: [
          {
            element: <Navigate replace to="/operator/dashboard" />,
            index: true,
          },
          {
            element: <Placeholder label="Operator dashboard" />,
            path: "dashboard",
          },
          {
            element: <Placeholder label="Batch detail" />,
            path: "uploads/:batchId",
          },
        ],
        path: "operator",
      },
      {
        children: [
          {
            element: <Navigate replace to="/reviewer/exceptions" />,
            index: true,
          },
          {
            element: <Placeholder label="Reviewer dashboard" />,
            path: "dashboard",
          },
          {
            element: <Placeholder label="Exception queue" />,
            path: "exceptions",
          },
          {
            element: <Placeholder label="Loan detail (reviewer)" />,
            path: "loans/:id",
          },
        ],
        path: "reviewer",
      },
      {
        children: [
          {
            element: <Navigate replace to="/consumer/dashboard" />,
            index: true,
          },
          {
            element: <Placeholder label="Consumer dashboard" />,
            path: "dashboard",
          },
          { element: <Placeholder label="Verified loan" />, path: "loans/:id" },
          { element: <Placeholder label="Export" />, path: "export" },
        ],
        path: "consumer",
      },
    ],
    element: <Layout />,
  },
];
