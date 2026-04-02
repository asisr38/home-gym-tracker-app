import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useUserDataSync } from "@/hooks/use-user-data-sync";
import { useStore } from "@/lib/store";

import Home from "@/pages/Home";
import Session from "@/pages/Session";
import Profile from "@/pages/Profile";
import Plan from "@/pages/Plan";
import History from "@/pages/History";
import WeeklyBreakdown from "@/pages/WeeklyBreakdown";
import ExerciseDetail from "@/pages/ExerciseDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Onboarding from "@/pages/Onboarding";

function getAuthenticatedHomePath(onboardingCompleted: boolean) {
  return onboardingCompleted ? "/" : "/onboarding";
}

function PublicOnlyRoute({ component: Component }: { component: ComponentType }) {
  const { user } = useAuth();
  const onboardingCompleted = useStore((state) => state.profile.onboardingCompleted);

  if (user) {
    return <Redirect to={getAuthenticatedHomePath(onboardingCompleted)} />;
  }

  return <Component />;
}

function ProtectedRoute({
  component: Component,
  allowIncompleteOnboarding = false,
}: {
  component: ComponentType;
  allowIncompleteOnboarding?: boolean;
}) {
  const { user } = useAuth();
  const onboardingCompleted = useStore((state) => state.profile.onboardingCompleted);

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!allowIncompleteOnboarding && !onboardingCompleted) {
    return <Redirect to="/onboarding" />;
  }

  return <Component />;
}

function Router() {
  const { user, loading } = useAuth();
  const { ready } = useUserDataSync(user);

  if (loading || !ready) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">{() => <ProtectedRoute component={Home} />}</Route>
      <Route path="/onboarding">
        {() => <ProtectedRoute component={Onboarding} allowIncompleteOnboarding />}
      </Route>
      <Route path="/login">{() => <PublicOnlyRoute component={Login} />}</Route>
      <Route path="/register">{() => <PublicOnlyRoute component={Register} />}</Route>
      <Route path="/forgot-password">{() => <PublicOnlyRoute component={ForgotPassword} />}</Route>
      <Route path="/session/:id">{() => <ProtectedRoute component={Session} />}</Route>
      <Route path="/exercise/:dayId/:exerciseId">
        {() => <ProtectedRoute component={ExerciseDetail} />}
      </Route>
      <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>
      <Route path="/plan">{() => <ProtectedRoute component={Plan} />}</Route>
      <Route path="/history">{() => <ProtectedRoute component={History} />}</Route>
      <Route path="/weekly">{() => <ProtectedRoute component={WeeklyBreakdown} />}</Route>
      <Route>{() => <Redirect to={user ? "/" : "/login"} />}</Route>
    </Switch>
  );
}

function App() {
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
