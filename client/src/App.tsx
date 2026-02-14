import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useUserDataSync } from "@/hooks/use-user-data-sync";

import Home from "@/pages/Home";
import Session from "@/pages/Session";
import Profile from "@/pages/Profile";
import Plan from "@/pages/Plan"; // Need to create
import History from "@/pages/History"; // Need to create
import WeeklyBreakdown from "@/pages/WeeklyBreakdown";
import ExerciseDetail from "@/pages/ExerciseDetail";

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
      <Route path="/" component={Home} />
      <Route path="/onboarding">{() => <Redirect to="/" />}</Route>
      <Route path="/login">{() => <Redirect to="/" />}</Route>
      <Route path="/register">{() => <Redirect to="/" />}</Route>
      <Route path="/forgot-password">{() => <Redirect to="/" />}</Route>
      <Route path="/session/:id" component={Session} />
      <Route path="/exercise/:dayId/:exerciseId" component={ExerciseDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/plan" component={Plan} />
      <Route path="/history" component={History} />
      <Route path="/weekly" component={WeeklyBreakdown} />
      <Route>{() => <Redirect to="/" />}</Route>
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
