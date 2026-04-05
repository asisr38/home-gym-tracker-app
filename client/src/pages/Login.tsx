import { useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/lib/supabase";
import { getAuthErrorMessage } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/ui/auth-shell";
import { MetricPill } from "@/components/ui/app-surfaces";
import { ArrowRight, Clock3, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const trimmedEmail = email.trim();
  const canSubmit = Boolean(trimmedEmail) && Boolean(password) && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    console.log("[IronStride:login] submit", { email: trimmedEmail, supabaseReady: Boolean(supabase) });
    try {
      if (!supabase) throw new Error("Authentication service unavailable.");
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (authError) {
        console.error("[IronStride:login] auth error", {
          message: authError.message,
          status: authError.status,
          code: (authError as any).code,
        });
        throw authError;
      }
      console.log("[IronStride:login] success", { userId: data.user?.id });
    } catch (err) {
      console.error("[IronStride:login] caught error", err);
      setError(getAuthErrorMessage(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign In"
      description="Pick up exactly where you left off and sync your training data across devices."
      badge={
        <MetricPill icon={ShieldCheck} tone="emerald">
          Secure sync
        </MetricPill>
      }
      features={[
        {
          icon: Sparkles,
          title: "Resume your split immediately",
          description: "Today, weekly progress, and saved workout state unlock as soon as you sign in.",
        },
        {
          icon: Clock3,
          title: "No extra setup if you already trained",
          description: "Use the same email on every device so your plan and history stay in one place.",
        },
      ]}
      footer={
        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
          <Link href="/register" className="text-primary hover:underline">
            Create account
          </Link>
        </div>
      }
    >
      <div className="rounded-[1.4rem] border border-border/60 bg-background/34 p-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-muted/50"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              spellCheck={false}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/50 pr-11"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
            Sign in with the email tied to your training account. If email confirmation is enabled,
            confirm the message from Supabase before logging in.
          </div>

          {error ? (
            <p role="alert" aria-live="polite" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading ? "Signing in..." : "Continue training"}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
