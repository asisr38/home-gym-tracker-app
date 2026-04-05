import { useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/lib/supabase";
import { getAuthErrorMessage } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/ui/auth-shell";
import { MetricPill } from "@/components/ui/app-surfaces";
import { ArrowRight, Clock3, MailCheck, ShieldCheck } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const trimmedEmail = email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);
    console.log("[IronStride:forgot-password] submit", { email: trimmedEmail, supabaseReady: Boolean(supabase) });
    try {
      if (!supabase) throw new Error("Authentication service unavailable.");
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
      );
      if (authError) {
        console.error("[IronStride:forgot-password] auth error", {
          message: authError.message,
          status: authError.status,
          code: (authError as any).code,
        });
        throw authError;
      }
      console.log("[IronStride:forgot-password] reset email sent");
      setSent(true);
    } catch (err) {
      console.error("[IronStride:forgot-password] caught error", err);
      setError(getAuthErrorMessage(err, "Unable to send reset email."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset Password"
      description="We’ll send a reset link to the email address attached to your account."
      badge={
        <MetricPill icon={MailCheck} tone={sent ? "emerald" : "default"}>
          {sent ? "Email sent" : "Recovery"}
        </MetricPill>
      }
      features={[
        {
          icon: ShieldCheck,
          title: "Use the exact email on your account",
          description: "The reset link only works for the address you originally used to sign in.",
        },
        {
          icon: Clock3,
          title: "Delivery can take a minute",
          description: "If nothing shows up right away, check spam or promotions before trying again.",
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
              spellCheck={false}
              required
            />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
            The email will contain a secure link from Supabase. Open it on the device where you
            want to finish the reset.
          </div>

          {error ? (
            <p role="alert" aria-live="polite" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {sent ? (
            <p aria-live="polite" className="text-xs text-emerald-300">
              Reset email sent. Check your inbox and spam folder.
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading || !trimmedEmail}>
            {loading ? "Sending..." : "Send Reset Email"}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
