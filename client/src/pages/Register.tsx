import { useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/lib/supabase";
import { getAuthErrorMessage } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/ui/auth-shell";
import { MetricPill } from "@/components/ui/app-surfaces";
import { ArrowRight, Cloud, Eye, EyeOff, ShieldCheck, UserPlus2 } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const trimmedEmail = email.trim();
  const passwordTooShort = password.length > 0 && password.length < 6;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    Boolean(trimmedEmail) &&
    password.length >= 6 &&
    confirmPassword.length > 0 &&
    !passwordsMismatch &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    console.log("[IronStride:register] submit", { email: trimmedEmail, supabaseReady: Boolean(supabase) });
    try {
      if (!supabase) throw new Error("Authentication service unavailable.");
      const { data, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      if (authError) {
        console.error("[IronStride:register] auth error", {
          message: authError.message,
          status: authError.status,
          code: (authError as any).code,
        });
        throw authError;
      }
      console.log("[IronStride:register] success", {
        userId: data.user?.id,
        hasSession: Boolean(data.session),
        emailConfirmRequired: !data.session,
      });
      if (!data.session) {
        setConfirmationSent(true);
        return;
      }
    } catch (err) {
      console.error("[IronStride:register] caught error", err);
      setError(getAuthErrorMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <AuthShell
        title="Check Your Email"
        description={
          <>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
            account.
          </>
        }
        badge={
          <MetricPill icon={Cloud} tone="emerald">
            Email sent
          </MetricPill>
        }
        features={[
          {
            icon: ShieldCheck,
            title: "Confirm first, then sign in",
            description: "Open the message from Supabase, tap the link, and come back here to access your plan.",
          },
        ]}
        footer={
          <div className="text-center">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        }
      >
        <div className="rounded-[1.4rem] border border-border/60 bg-background/34 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">What happens next</p>
          <p className="mt-2 leading-6">
            Open the message, confirm the account, then come back to sign in. If the email does
            not arrive, check spam or promotions before requesting another link.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create Account"
      description="Create an account to sync your split, progress history, and workout state."
      badge={
        <MetricPill icon={UserPlus2} tone="primary">
          2-minute setup
        </MetricPill>
      }
      features={[
        {
          icon: Cloud,
          title: "Your plan follows you",
          description: "Profile, current split, and recent workout history stay in sync across devices.",
        },
        {
          icon: ShieldCheck,
          title: "Simple email/password login",
          description: "No extra providers. Create the account here, then continue into onboarding.",
        },
      ]}
      footer={
        <div className="text-center">
          <Link href="/login" className="text-primary hover:underline">
            Already have an account? Sign in
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
                onClick={() => setShowPasswords((prev) => !prev)}
              >
                {showPasswords ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPasswords ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/50 pr-11"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPasswords((prev) => !prev)}
                aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-muted/50"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-xs leading-5 text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Password requirement</span>
              <span className={password.length >= 6 ? "text-emerald-300" : ""}>
                {password.length >= 6 ? "Ready" : "At least 6 characters"}
              </span>
            </div>
            {passwordsMismatch ? (
              <div className="mt-1 text-destructive">Passwords do not match yet.</div>
            ) : null}
          </div>

          {error ? (
            <p role="alert" aria-live="polite" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {!error && passwordTooShort ? (
            <p className="text-xs text-muted-foreground">
              Use a password with at least 6 characters.
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading ? "Creating..." : "Create Account"}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
