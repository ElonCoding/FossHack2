"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";

export default function SignInPage() {
  const router = useRouter();
  const { signIn, signInDemo, user } = useAuth();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [demoSubmitting, setDemoSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) router.replace("/events");
  }, [router, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(identifier, password);
      router.push("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoSubmitting(true);
    setError(null);
    try {
      await signInDemo();
      router.push("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setDemoSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={handleDemoLogin}
        disabled={demoSubmitting || submitting}
        data-testid="demo-login-button"
      >
        {demoSubmitting ? "Signing in Demo..." : "Demo Login (demo / demo123)"}
      </Button>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Input
          type="text"
          placeholder="Email or username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
          data-testid="login-identifier-input"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          data-testid="login-password-input"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button disabled={submitting || demoSubmitting} type="submit" data-testid="login-submit-button">
          {submitting ? "Signing in..." : "Sign In"}
        </Button>
        <Button variant="link" type="button" onClick={() => router.push("/forgot-password")}>
          Forgot password?
        </Button>
      </form>
    </section>
  );
}
