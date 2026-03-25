"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("Missing reset token.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: { token, password },
      });
      setMessage(response.message);
      setTimeout(() => router.push("/signin"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">Reset password</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button disabled={submitting} type="submit">
          {submitting ? "Updating..." : "Reset password"}
        </Button>
      </form>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<section className="mx-auto w-full max-w-md px-4 py-12">Loading...</section>}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
