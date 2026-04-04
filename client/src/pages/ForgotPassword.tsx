import { useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/lib/supabase";
import { getAuthErrorMessage } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/ui/auth-shell";
import { MetricPill } from "@/components/ui/app-surfaces";
import { ArrowRight, MailCheck } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);
    console.log("[IronStride:forgot-password] submit", { email: email.trim(), supabaseReady: Boolean(supabase) });
    try {
      if (!supabase) throw new Error("Authentication service unavailable.");
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
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
      footer={
        <div className="text-center">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2">
        <MetricPill icon={MailCheck} tone={sent ? "emerald" : "default"}>
          {sent ? "Reset email sent" : "Email recovery"}
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
                required
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
            {sent && <p className="text-xs text-green-600">Reset email sent.</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Email"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
      </div>
    </AuthShell>
  );
}
