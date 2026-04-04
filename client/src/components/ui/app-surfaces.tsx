import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SurfaceTone } from "@/lib/day-ui";

const toneClasses: Record<SurfaceTone, string> = {
  default:
    "border-border/60 bg-card/70 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.85)]",
  primary:
    "border-primary/20 bg-linear-to-br from-primary/18 via-card/78 to-card/72 shadow-[0_24px_48px_-32px_hsl(var(--primary)/0.45)]",
  blue:
    "border-sky-400/18 bg-linear-to-br from-sky-500/18 via-card/78 to-card/72 shadow-[0_24px_48px_-32px_rgba(14,165,233,0.35)]",
  violet:
    "border-violet-400/18 bg-linear-to-br from-violet-500/18 via-card/78 to-card/72 shadow-[0_24px_48px_-32px_rgba(139,92,246,0.34)]",
  amber:
    "border-amber-400/18 bg-linear-to-br from-amber-500/18 via-card/78 to-card/72 shadow-[0_24px_48px_-32px_rgba(245,158,11,0.34)]",
  emerald:
    "border-emerald-400/18 bg-linear-to-br from-emerald-500/18 via-card/78 to-card/72 shadow-[0_24px_48px_-32px_rgba(16,185,129,0.34)]",
  rose:
    "border-rose-400/18 bg-linear-to-br from-rose-500/18 via-card/78 to-card/72 shadow-[0_24px_48px_-32px_rgba(244,63,94,0.34)]",
};

type SurfaceCardProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: SurfaceTone;
};

export function SurfaceCard({
  className,
  tone = "default",
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border p-4 backdrop-blur-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_32%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="text-eyebrow">{eyebrow}</p> : null}
        <h1 className="text-[1.9rem] font-bold tracking-[-0.04em] leading-none text-balance">
          {title}
        </h1>
        {description ? (
          <p className="max-w-[24rem] text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type MetricPillProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: LucideIcon;
  tone?: SurfaceTone;
};

const pillToneClasses: Record<SurfaceTone, string> = {
  default: "border-border/60 bg-muted/45 text-foreground",
  primary: "border-primary/20 bg-primary/12 text-primary",
  blue: "border-sky-400/20 bg-sky-500/12 text-sky-300",
  violet: "border-violet-400/20 bg-violet-500/12 text-violet-300",
  amber: "border-amber-400/20 bg-amber-500/12 text-amber-300",
  emerald: "border-emerald-400/20 bg-emerald-500/12 text-emerald-300",
  rose: "border-rose-400/20 bg-rose-500/12 text-rose-300",
};

export function MetricPill({
  icon: Icon,
  tone = "default",
  className,
  children,
  ...props
}: MetricPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.02em]",
        pillToneClasses[tone],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{children}</span>
    </div>
  );
}

type SectionHeadingProps = {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/60 bg-card/70 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em]">{title}</h2>
            {description ? (
              <p className="text-xs leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
