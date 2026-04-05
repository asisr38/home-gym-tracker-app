"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const APP_CACHE_PREFIX = "ironstride-";

function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const syncServiceWorker = async () => {
      if (process.env.NODE_ENV !== "production") {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(
            cacheKeys
              .filter((key) => key.startsWith(APP_CACHE_PREFIX))
              .map((key) => caches.delete(key)),
          );
        }
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
    };

    syncServiceWorker().catch(() => {
      // SW registration/cleanup is best-effort; failure is non-fatal
    });
  }, []);
  return null;
}

function ThemePreferenceSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      if (media.matches) {
        root.classList.add("light");
      } else {
        root.classList.remove("light");
      }
    };

    applyTheme();

    if (media.addEventListener) {
      media.addEventListener("change", applyTheme);
      return () => media.removeEventListener("change", applyTheme);
    }

    media.addListener(applyTheme);
    return () => media.removeListener(applyTheme);
  }, []);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ServiceWorkerRegistration />
          <ThemePreferenceSync />
          <Toaster />
          {children}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
