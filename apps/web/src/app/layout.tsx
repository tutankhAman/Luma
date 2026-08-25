import "./globals.css";
import "remixicon/fonts/remixicon.css";

import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Layout() {
  return (
    <div className={cn("min-h-screen font-sans")}>
      <Outlet />
    </div>
  );
}
