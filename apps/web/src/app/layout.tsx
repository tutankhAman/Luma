import "./globals.css";
import "remixicon/fonts/remixicon.css";

import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Layout() {
  return (
    <div className={cn("dark min-h-screen bg-black font-sans text-white")}>
      <Outlet />
    </div>
  );
}
