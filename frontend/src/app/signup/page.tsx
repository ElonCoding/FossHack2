"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, user } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) router.replace("/events");
  }, [router, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signUp({ name, email, password });
      router.push("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">Create account</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Input placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">Use at least 8 characters, including uppercase and numbers.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button disabled={submitting} type="submit">
          {submitting ? "Creating..." : "Sign Up"}
        </Button>
      </form>
    </section>
  );
}
