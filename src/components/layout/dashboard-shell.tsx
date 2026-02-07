"use client";

import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export const DashboardShell = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={user?.role} />
      <div className="flex w-full flex-col">
        <Topbar />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
};
