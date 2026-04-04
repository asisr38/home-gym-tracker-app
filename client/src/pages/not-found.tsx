import { SurfaceCard } from "@/components/ui/app-surfaces";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";

export default function NotFound() {
  return (
    <div className="min-h-screen app-shell px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <SurfaceCard tone="rose" className="w-full p-5">
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-rose-400/20 bg-rose-500/12">
                <AlertCircle className="h-5 w-5 text-rose-300" />
              </span>
              <div>
                <p className="text-eyebrow">Not Found</p>
                <h1 className="text-2xl font-bold tracking-[-0.04em]">404 Page Not Found</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  The route doesn&apos;t exist or the page hasn&apos;t been wired into the application yet.
                </p>
              </div>
            </div>

            <Link href="/">
              <Button className="w-full">Go to Today</Button>
            </Link>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
