import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { SurfaceCard } from "@/components/ui/app-surfaces";
import { cn } from "@/lib/utils";

type AuthShellFeature = {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
};

type AuthShellProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
  features?: AuthShellFeature[];
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
  badge,
  features,
}: AuthShellProps) {
  return (
    <div className="min-h-screen app-shell px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <SurfaceCard tone="primary" className={cn("w-full p-5", className)}>
          <div className="space-y-6">
            <div className="rounded-[1.6rem] border border-white/10 bg-background/38 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-eyebrow">IronStride</p>
                    <h1 className="text-3xl font-bold tracking-[-0.05em] leading-none">{title}</h1>
                    <p className="text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                  {badge ? <div className="shrink-0">{badge}</div> : null}
                </div>

                {features?.length ? (
                  <div className="grid gap-2">
                    {features.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <div
                          key={String(feature.title)}
                          className="flex items-start gap-3 rounded-[1.2rem] border border-border/60 bg-background/34 px-3 py-3"
                        >
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card/70 text-primary">
                            {Icon ? <Icon className="h-4 w-4" /> : null}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold tracking-[-0.02em]">{feature.title}</p>
                            {feature.description ? (
                              <p className="text-xs leading-5 text-muted-foreground">
                                {feature.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {children}

            {footer ? <div className="border-t border-border/60 pt-4 text-sm">{footer}</div> : null}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
