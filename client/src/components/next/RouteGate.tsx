"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserDataSync } from "@/hooks/use-user-data-sync";
import { useStore } from "@/lib/store";
import { getAuthenticatedHomePath } from "@/lib/auth-routing";

type RouteMode = "protected" | "public";

function LoadingScreen() {
  return (
    <div className="min-h-screen app-shell flex items-center justify-center">
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  );
}

export function RouteGate({
  children,
  mode,
  allowIncompleteOnboarding = false,
}: {
  children: React.ReactNode;
  mode: RouteMode;
  allowIncompleteOnboarding?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { user, loading } = useAuth();
  const onboardingCompleted = useStore((state) => state.profile.onboardingCompleted);
  const { ready } = useUserDataSync(user);
  const authenticatedHomePath = getAuthenticatedHomePath(onboardingCompleted);

  useEffect(() => {
    if (loading || !ready) return;

    if (mode === "public" && user) {
      if (pathname !== authenticatedHomePath) {
        router.replace(authenticatedHomePath);
      }
      return;
    }

    if (mode === "protected" && !user) {
      if (pathname !== "/login") {
        router.replace("/login");
      }
      return;
    }

    if (
      mode === "protected" &&
      user &&
      !allowIncompleteOnboarding &&
      !onboardingCompleted &&
      pathname !== "/onboarding"
    ) {
      router.replace("/onboarding");
    }
  }, [
    allowIncompleteOnboarding,
    authenticatedHomePath,
    loading,
    mode,
    onboardingCompleted,
    pathname,
    ready,
    router,
    user,
  ]);

  if (loading || !ready) {
    return <LoadingScreen />;
  }

  if (mode === "public" && user) {
    return <LoadingScreen />;
  }

  if (mode === "protected" && !user) {
    return <LoadingScreen />;
  }

  if (mode === "protected" && user && !allowIncompleteOnboarding && !onboardingCompleted) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
