import "./globals.css";
import "remixicon/fonts/remixicon.css";

import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Outlet />
    </div>
  );
}
