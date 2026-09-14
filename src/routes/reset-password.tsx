import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — AIVORA Control Center" },
      {
        name: "description",
        content: "Choose a new password for your AIVORA flash flood intelligence account.",
      },
      { property: "og:title", content: "Set a new password — AIVORA Control Center" },
      {
        property: "og:description",
        content: "Secure password reset for AIVORA operators and community users.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const finishLink = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash") ?? hash.get("token_hash");
      const errorDescription =
        url.searchParams.get("error_description") ?? hash.get("error_description");
      const errorCode = url.searchParams.get("error_code") ?? hash.get("error_code");
      let failure: string | null = errorDescription
        ? errorDescription.replace(/\+/g, " ")
        : errorCode
          ? `This link is no longer valid (${errorCode}).`
          : null;

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) failure = failure ?? error.message;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (error) failure = failure ?? error.message;
        }
      } catch (err) {
        failure = failure ?? (err instanceof Error ? err.message : "Could not open the reset link.");
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const hasSession = Boolean(data.session);
      setReady(hasSession);
      setLinkError(hasSession ? null : (failure ?? "This reset link has expired or was already used."));
      setChecking(false);
    };

    void finishLink();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Both passwords must match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You are signed in.");
      void navigate({ to: "/overview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the password");
    } finally {
      setBusy(false);
    }
  };

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("A fresh reset link is on its way. Open it on this same device.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send a new link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="panel w-full max-w-md p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <span className="data-label">AIVORA account recovery</span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold">Choose a new password</h1>

        {checking ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking your reset link…
          </p>
        ) : !ready ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-destructive">{linkError}</p>
            <p className="text-xs text-muted-foreground">
              Reset links work once, expire after about an hour, and must be opened on the same
              device and browser where you asked for them. Enter your email to get a new one.
            </p>
            <form onSubmit={resend} className="space-y-3">
              <div>
                <Label htmlFor="resend-email">Email</Label>
                <Input
                  id="resend-email"
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Send me a new link
              </Button>
            </form>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="confirm">Repeat new password</Label>
              <Input
                id="confirm"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
