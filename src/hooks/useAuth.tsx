import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "responder" | "community";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "District Control Room",
  responder: "Field Responder",
  community: "Community User",
};

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  displayName: string;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRole = async (userId: string) => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).limit(1),
        supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      ]);
      if (!active) return;
      setDisplayName(profile?.display_name ?? "");

      let resolved = roles?.[0]?.role as AppRole | undefined;
      if (!resolved) {
        // Server decides the access level from the approved control-room email list.
        const { data: assigned } = await supabase.rpc("assign_my_role");
        resolved = (assigned as AppRole | null) ?? "community";
      }
      if (!active) return;
      setRole(resolved);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) void loadRole(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === "SIGNED_OUT") {
        setRole(null);
        setDisplayName("");
        return;
      }
      if (next?.user) void loadRole(next.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      loading,
      displayName,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshRole: async () => {
        const userId = session?.user.id;
        if (!userId) return;
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).limit(1);
        setRole((data?.[0]?.role as AppRole | undefined) ?? "admin");
      },
    }),
    [session, role, loading, displayName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Which sidebar sections each role may open. */
export const ROLE_ACCESS: Record<AppRole, string[]> = {
  admin: [
    "/overview",
    "/risk-map",
    "/predictions",
    "/sensors",
    "/vulnerability",
    "/alerts",
    "/evacuation",
    "/emergency-actions",
    "/historical",
    "/simulation",
    "/system-health",
    "/data-sources",
    "/pipeline",
    "/community",
    "/settings",
  ],
  responder: [
    "/overview",
    "/alerts",
    "/risk-map",
    "/evacuation",
    "/emergency-actions",
    "/sensors",
    "/community",
    "/settings",
  ],
  community: ["/community", "/alerts", "/evacuation", "/settings"],
};
