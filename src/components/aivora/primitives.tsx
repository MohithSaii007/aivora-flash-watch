import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { RISK_META } from "@/lib/aivora/engine";
import type { RiskLevel } from "@/lib/aivora/types";
import { cn } from "@/lib/utils";

export function RiskBadge({
  level,
  size = "sm",
  className,
}: {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const meta = RISK_META[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-mono font-semibold uppercase tracking-widest",
        meta.bg,
        meta.border,
        meta.text,
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3.5 py-1.5 text-sm",
        className,
      )}
      aria-label={`Risk level ${meta.label}`}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function LiveIndicator({
  label = "LIVE",
  tone = "primary",
  className,
}: {
  label?: string;
  tone?: "primary" | "normal" | "watch" | "critical" | "muted";
  className?: string;
}) {
  const dot =
    tone === "normal"
      ? "bg-normal"
      : tone === "watch"
        ? "bg-watch"
        : tone === "critical"
          ? "bg-critical"
          : tone === "muted"
            ? "bg-muted-foreground"
            : "bg-primary";
  return (
    <span className={cn("inline-flex items-center gap-1.5 data-label", className)}>
      <span className={cn("size-1.5 rounded-full animate-pulse-live", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel flex min-w-0 flex-col", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  hint,
  level,
  to,
  live,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  level?: RiskLevel;
  to?: string;
  live?: boolean;
}) {
  const meta = level ? RISK_META[level] : null;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="data-label">{label}</span>
        {live && <LiveIndicator label="LIVE" tone={level === "CRITICAL" ? "critical" : "primary"} />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={cn("metric text-3xl", meta ? meta.text : "text-foreground")}>{value}</span>
        {unit && <span className="font-mono text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">{hint}</span>
        {level && <RiskBadge level={level} />}
      </div>
    </>
  );

  const base =
    "panel group block p-4 text-left transition-colors hover:border-primary/50 focus-visible:border-primary";
  if (to) {
    return (
      <Link to={to} className={base}>
        {body}
      </Link>
    );
  }
  return <div className={cn(base, "hover:border-border")}>{body}</div>;
}

export function RiskScoreGauge({ score, level }: { score: number; level: RiskLevel }) {
  const meta = RISK_META[level];
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-muted)" strokeWidth="9" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={`var(--color-${meta.token})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 264} 264`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("metric text-2xl", meta.text)}>{score}</span>
          <span className="font-mono text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="min-w-0">
        <span className="data-label">Composite risk score</span>
        <div className="mt-1">
          <RiskBadge level={level} size="lg" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Rainfall 30% · Soil 20% · River 20% · Terrain 15% · History 10% · Exposure 5%
        </p>
      </div>
    </div>
  );
}

export function Freshness({ ts, prefix = "Last updated" }: { ts: number; prefix?: string }) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = window.setInterval(() => force((v) => v + 1), 1000);
    return () => window.clearInterval(h);
  }, []);
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  const text =
    seconds < 3 ? "just now" : seconds < 60 ? `${seconds} seconds ago` : `${Math.round(seconds / 60)} min ago`;
  return (
    <span className="font-mono text-[11px] text-muted-foreground">
      {prefix}: {text}
    </span>
  );
}

export function StatBar({
  label,
  value,
  max = 100,
  unit,
  tone = "primary",
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  tone?: "primary" | "normal" | "watch" | "warning" | "critical";
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="data-label">{label}</span>
        <span className="metric text-sm">
          {value.toFixed(1)}
          {unit && <span className="ml-1 font-mono text-[11px] text-muted-foreground">{unit}</span>}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            tone === "primary" && "bg-primary",
            tone === "normal" && "bg-normal",
            tone === "watch" && "bg-watch",
            tone === "warning" && "bg-warning",
            tone === "critical" && "bg-critical",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
      {icon}
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-sm text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

export function PrototypeNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-md border border-watch/40 bg-watch/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-watch",
        className,
      )}
    >
      Simulated prototype data · not an official warning
    </p>
  );
}
