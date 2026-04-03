import { useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/lib/supabase";
import { getAuthErrorMessage } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    console.log("[IronStride:login] submit", { email: email.trim(), supabaseReady: Boolean(supabase) });
    try {
      if (!supabase) throw new Error("Authentication service unavailable.");
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
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
    <div className="min-h-screen app-shell p-6 flex items-center justify-center">
      <Card className="w-full max-w-md border-border/60 shadow-2xl app-panel">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter text-primary">IronStride</CardTitle>
          <CardDescription>Sign in to sync your training data.</CardDescription>
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
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" className="w-full text-lg h-12" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
            <Link href="/register" className="text-primary hover:underline">
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
