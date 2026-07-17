"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      if (!response.ok) {
        setError("Sign-in failed. Check your credentials and try again.");
        setPending(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sign-in is temporarily unavailable.");
      setPending(false);
    }
  }

  return (
    <form className="il-stack-section" onSubmit={onSubmit} noValidate>
      <label className="il-field">
        <span className="il-label">Email</span>
        <input
          className="il-input"
          type="email"
          name="email"
          autoComplete="username"
          required
          disabled={pending}
        />
      </label>
      <label className="il-field">
        <span className="il-label">Password</span>
        <input
          className="il-input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </label>
      {error ? (
        <p className="il-field-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="il-button il-button--primary il-button--md"
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
