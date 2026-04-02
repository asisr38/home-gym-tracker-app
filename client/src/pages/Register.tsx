import { useState } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { getAuthErrorMessage } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Register() {
  const [, setLocation] = useLocation();
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
    try {
      if (!supabase) throw new Error("Authentication service unavailable.");
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      // No session means email confirmation is required
      if (!data.session) {
        setConfirmationSent(true);
        return;
      }
      setLocation("/");
    } catch (err) {
      setError(getAuthErrorMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <div className="min-h-screen app-shell p-6 flex items-center justify-center">
        <Card className="w-full max-w-md border-border/60 shadow-2xl app-panel">
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tighter text-primary">Check your email</CardTitle>
            <CardDescription>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-center">
              <Link href="/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell p-6 flex items-center justify-center">
      <Card className="w-full max-w-md border-border/60 shadow-2xl app-panel">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter text-primary">Create Account</CardTitle>
          <CardDescription>Start syncing your training plan.</CardDescription>
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

            <Button type="submit" className="w-full text-lg h-12" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-sm text-center">
            <Link href="/login" className="text-primary hover:underline">
              Already have an account? Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
