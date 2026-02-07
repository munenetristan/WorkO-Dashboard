"use client";

import { useRouter } from "next/navigation";
import { Menu, Search, LogOut, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/store/auth";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 px-4 backdrop-blur lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
        <span className="text-slate-900">Admin Workspace</span>
        <span className="text-slate-300">/</span>
        <span>Dashboard</span>
      </div>
      <div className="ml-auto flex flex-1 items-center justify-end gap-3">
        <div className="hidden w-full max-w-sm items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm text-muted-foreground md:flex">
          <Search className="h-4 w-4" />
          <Input
            className="h-7 border-0 bg-transparent p-0 focus-visible:ring-0"
            placeholder="Search modules, users, trips..."
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <UserCircle2 className="h-5 w-5" />
              <span className="hidden text-sm font-medium text-slate-700 sm:inline">
                Admin
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}