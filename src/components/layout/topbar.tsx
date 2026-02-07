"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui";

export const Topbar = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">WorkO Admin</h1>
        <p className="text-xs text-slate-500">
          {user?.name ?? "Admin"} · {user?.role ?? ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => router.push("/settings")}>
          Settings
        </Button>
        <Button variant="ghost" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </div>
  );
};
