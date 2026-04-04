import { useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/lib/supabase";
import { getAuthErrorMessage } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/ui/auth-shell";
import { MetricPill } from "@/components/ui/app-surfaces";
import { ArrowRight, Cloud, UserPlus2 } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    console.log("[IronStride:register] submit", { email: email.trim(), supabaseReady: Boolean(supabase) });
    try {
      if (!supabase) throw new Error("Authentication service unavailable.");
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
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
        footer={
          <div className="text-center">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        }
      >
        <MetricPill icon={Cloud} tone="emerald">
          Confirmation sent
        </MetricPill>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create Account"
      description="Create an account to sync your split, progress history, and workout state."
      footer={
        <div className="text-center">
          <Link href="/login" className="text-primary hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2">
        <MetricPill icon={UserPlus2} tone="primary">
          Account setup
        </MetricPill>
        <MetricPill icon={Cloud} tone="emerald">
          Cross-device sync
        </MetricPill>
      </div>

      <div>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                inputMode="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/50"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-muted/50"
                autoComplete="new-password"
                required
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
      </div>
    </AuthShell>
  );
}
