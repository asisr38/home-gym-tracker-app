import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useUserDataSync } from "@/hooks/use-user-data-sync";

import Onboarding from "@/pages/Onboarding";
import Home from "@/pages/Home";
import Session from "@/pages/Session";
import Profile from "@/pages/Profile";
import Plan from "@/pages/Plan"; // Need to create
import History from "@/pages/History"; // Need to create
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";

function Router() {
  const { user, loading } = useAuth();
  const { ready } = useUserDataSync(user);
  const { profile } = useStore();

  if (loading || !ready) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route>{() => <Redirect to="/login" />}</Route>
      </Switch>
    );
  }

  if (!profile.onboardingCompleted) {
    return (
      <Switch>
        <Route path="/onboarding" component={Onboarding} />
        <Route>{() => <Redirect to="/onboarding" />}</Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/session/:id" component={Session} />
      <Route path="/profile" component={Profile} />
      <Route path="/plan" component={Plan} />
      <Route path="/history" component={History} />
      <Route>{() => <Redirect to="/" />}</Route>
    </Switch>
  );
}

function App() {
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
