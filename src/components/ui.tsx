"use client";

import { type ReactNode } from "react";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const Badge = ({
  tone = "slate",
  children,
}: {
  tone?: "slate" | "green" | "yellow" | "red" | "blue" | "purple";
  children: ReactNode;
}) => {
  const toneStyles: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        toneStyles[tone]
      )}
    >
      {children}
    </span>
  );
};

export const Button = ({
  variant = "primary",
  size = "md",
  children,
  type = "button",
  onClick,
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}) => {
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-base",
  };
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition",
        sizes[size],
        variants[variant]
      )}
    >
      {children}
    </button>
  );
};

export const Card = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cx("rounded-2xl border border-slate-200 bg-white p-6", className)}>
    {children}
  </div>
);

export const SectionHeading = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
    {action}
  </div>
);

export const Toggle = ({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cx(
      "relative inline-flex h-6 w-11 items-center rounded-full transition",
      enabled ? "bg-emerald-500" : "bg-slate-300"
    )}
  >
    <span
      className={cx(
        "inline-block h-4 w-4 transform rounded-full bg-white transition",
        enabled ? "translate-x-6" : "translate-x-1"
      )}
    />
  </button>
);

export const Modal = ({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-6 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
};

export const StatCard = ({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) => (
  <Card className="flex flex-col gap-3">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-semibold text-slate-900">{value}</span>
      <Badge tone="green">{delta}</Badge>
    </div>
  </Card>
);
