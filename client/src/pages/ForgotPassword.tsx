import { useState } from "react";
import { Link } from "wouter";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Unable to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-shell p-6 flex items-center justify-center">
      <Card className="w-full max-w-md border-border/60 shadow-2xl app-panel">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter text-primary">Reset Password</CardTitle>
          <CardDescription>We will email you a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
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

            <Button type="submit" className="w-full text-lg h-12" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Email"}
            </Button>
          </form>

          <div className="mt-4 text-sm text-center">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
