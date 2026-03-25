"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch<{ message: string; resetToken?: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setMessage(
        response.resetToken
          ? `${response.message}. Development reset token: ${response.resetToken}`
          : response.message
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">Forgot password</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button disabled={submitting} type="submit">
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </section>
  );
}
