import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LiveIndicator, PrototypeNotice } from "@/components/aivora/primitives";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup" | "forgot" | "reset";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AIVORA Control Center" },
      {
        name: "description",
        content:
          "Sign in to the AIVORA flash flood intelligence control centre as district control room, field responder or community user.",
      },
      { property: "og:title", content: "Sign in — AIVORA Control Center" },
      {
        property: "og:description",
        content: "Role-based access to the AIVORA flash flood intelligence prototype.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isRecovery =
      window.location.hash.includes("type=recovery") ||
      new URL(window.location.href).searchParams.get("type") === "recovery";
    if (isRecovery) {
      setMode("reset");
      window.location.replace(
        `/reset-password${window.location.search}${window.location.hash}`,
      );
    }
  }, []);

  useEffect(() => {
    if (session && mode !== "reset") void navigate({ to: "/overview" });
  }, [session, mode, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in to AIVORA Control Center");
        void navigate({ to: "/overview" });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        const userId = data.user?.id;
        if (userId && data.session) {
          await supabase.from("profiles").upsert({ id: userId, display_name: name || email });
          await supabase.rpc("assign_my_role");
        }
        if (data.session) {
          toast.success("Account created");
          void navigate({ to: "/overview" });
        } else {
          toast.success("Account created. Check your email to confirm, then sign in.");
          setMode("login");
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent");
        setMode("login");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated");
        void navigate({ to: "/overview" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setBusy(true);
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error(String(result.error));
      if (result.redirected) return;
      void navigate({ to: "/overview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="grid-backdrop relative hidden flex-col justify-between border-r border-border bg-surface p-10 lg:flex">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> Back to landing page
          </Link>
        </div>
        <div className="max-w-md">
          <LiveIndicator label="System active" />
          <h1 className="mt-4 font-display text-4xl font-bold">AIVORA</h1>
          <p className="mt-2 text-sm text-primary">
            Predict Early. Warn Locally. Act Faster. Save Lives.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            District Emergency Control Room for AI-driven hyper-local flash flood intelligence in hilly
            regions. Observe. Predict. Protect.
          </p>
          <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
            <li>· Hyper-local risk at village, ward, grid and catchment level</li>
            <li>· Actionable lead-time estimation with stated uncertainty</li>
            <li>· Explainable AI behind every alert</li>
            <li>· Safest evacuation routing, not just the shortest</li>
          </ul>
        </div>
        <PrototypeNotice className="max-w-md" />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="panel w-full max-w-md p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="data-label">Problem statement SIH26192</span>
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold">
            {mode === "login" && "Sign in to Control Center"}
            {mode === "signup" && "Create operator account"}
            {mode === "forgot" && "Reset your password"}
            {mode === "reset" && "Choose a new password"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "signup"
              ? "Your access level is decided by your email address, not chosen here."
              : "Access is role-based and every screen is labelled as prototype data."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="A. Sharma"
                  className="mt-1.5"
                />
              </div>
            )}

            {mode !== "reset" && (
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="control.room@devraan.gov.example"
                  className="mt-1.5"
                />
              </div>
            )}

            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">
                  {mode === "reset" ? "New password" : "Password"}
                </Label>
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
            )}

            {mode === "signup" && (
              <div className="rounded-md border border-border bg-secondary px-3 py-2 text-[11px] text-muted-foreground">
                <span className="block font-semibold text-foreground">
                  Control Room access is restricted
                </span>
                Only approved official email addresses receive District Control Room access. Everyone
                else gets the Community view: local risk, warnings, safe route and nearest shelter.
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" && "Enter Control Center"}
              {mode === "signup" && "Create account"}
              {mode === "forgot" && "Send reset link"}
              {mode === "reset" && "Update password"}
            </Button>
          </form>

          {(mode === "login" || mode === "signup") && (
            <>
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="data-label">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={googleSignIn}
                disabled={busy}
              >
                Continue with Google
              </Button>
            </>
          )}

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {mode !== "login" && (
              <button onClick={() => setMode("login")} className="underline-offset-2 hover:underline">
                Back to sign in
              </button>
            )}
            {mode === "login" && (
              <>
                <button onClick={() => setMode("signup")} className="underline-offset-2 hover:underline">
                  Create an account
                </button>
                <button onClick={() => setMode("forgot")} className="underline-offset-2 hover:underline">
                  Forgot password?
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
