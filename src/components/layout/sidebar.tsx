"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/types";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const NAV_ITEMS = [
  { label: "Overview", href: "/" },
  { label: "Countries", href: "/countries" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Providers", href: "/providers" },
  { label: "Jobs", href: "/jobs" },
  { label: "Admin Users", href: "/admin-users", role: "SUPER_ADMIN" },
  { label: "Settings", href: "/settings" },
];

export const Sidebar = ({ role }: { role?: AdminRole | null }) => {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white px-4 py-6 lg:block">
      <div className="px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            W
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">WorkO</p>
            <p className="text-xs text-slate-500">Admin Dashboard</p>
          </div>
        </div>
      </div>
      <nav className="mt-10 flex flex-col gap-2">
        {NAV_ITEMS.filter((item) =>
          item.role ? item.role === role : true
        ).map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center justify-between rounded-xl px-4 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {item.label}
              {isActive ? (
                <span className="h-2 w-2 rounded-full bg-white" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
