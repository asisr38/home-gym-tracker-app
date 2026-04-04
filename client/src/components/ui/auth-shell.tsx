import * as React from "react";

import { SurfaceCard } from "@/components/ui/app-surfaces";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
}: AuthShellProps) {
  return (
    <div className="min-h-screen app-shell px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <SurfaceCard tone="primary" className={cn("w-full p-5", className)}>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-eyebrow">IronStride</p>
                <h1 className="text-3xl font-bold tracking-[-0.05em] leading-none">{title}</h1>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
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
