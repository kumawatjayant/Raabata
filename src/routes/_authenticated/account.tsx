import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/site-shell";
import { MentorWorkspace, StudentWorkspace } from "@/components/portal-panels";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL, friendlyError, myRoles } from "@/lib/access";
import {
  getLocalDevSession,
  readLocalDb,
  setLocalDevSession,
  updateLocalDb,
} from "@/lib/local-store";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [{ title: "My account | Rabata" }, { name: "robots", content: "noindex" }],
  }),
  component: Account,
});

function Account() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const local = getLocalDevSession();
      if (local) {
        const db = readLocalDb();
        const profile = db.app_profiles.find((p) => p.user_id === local.userId) ?? {
          display_name: local.displayName,
          phone: null,
          location: null,
        };
        const roles = db.user_roles.filter((r) => r.user_id === local.userId);
        return {
          user: { id: local.userId, email: local.email },
          profile,
          roles,
          isLocal: true,
        };
      }
      const { data } = await supabase.auth.getUser();
      const user = data.user!;
      const { data: profile } = await supabase
        .from("app_profiles")
        .select("display_name,phone,location")
        .eq("user_id", user.id)
        .maybeSingle();
      return { user, profile, roles: await myRoles(user.id), isLocal: false };
    },
  });

  if (me.isLoading || !me.data) {
    return (
      <section className="section">
        <div className="container">Loading…</div>
      </section>
    );
  }

  const { user, profile, roles, isLocal } = me.data;
  const isAdmin = roles.some((r) => r.role === "admin" && r.status === "active");
  const isMentor = roles.some((r) => r.role === "mentor" && r.status === "active");
  const isStudent = roles.some((r) => r.role === "student" && r.status === "active");

  async function saveProfile(form: HTMLFormElement) {
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const displayName = (v["display_name"] ?? "").trim().slice(0, 120);
    const phone = (v["phone"] ?? "").trim().slice(0, 40) || null;
    const location = (v["location"] ?? "").trim().slice(0, 160) || null;

    if (isLocal) {
      updateLocalDb((db) => ({
        ...db,
        app_profiles: [
          ...db.app_profiles.filter((p) => p.user_id !== user.id),
          { user_id: user.id, display_name: displayName, phone, location },
        ],
      }));
      setMsg("Profile saved locally.");
      qc.invalidateQueries({ queryKey: ["me"] });
      return;
    }

    const { error } = await supabase.from("app_profiles").upsert({
      user_id: user.id,
      display_name: displayName,
      phone,
      location,
    });
    setMsg(error ? "Profile could not be saved." : "Profile saved.");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function request(role: "mentor" | "student") {
    if (isLocal) {
      setMsg("Local preview account already has its role assigned.");
      return;
    }
    const { error } = await supabase.rpc("request_app_role", { p_role: role });
    setMsg(
      error ? friendlyError(error.message) : `Your ${role} access request was sent for review.`,
    );
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function claimAdmin() {
    if (isLocal) return;
    const { error } = await supabase.rpc("bootstrap_initial_admin");
    setMsg(error ? friendlyError(error.message) : "You are now the Rabata administrator.");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function signOut() {
    setLocalDevSession(null);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut().catch(() => {});
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <PageHeading
        eyebrow={isLocal ? "My account (Local Preview)" : "My account"}
        title={profile?.display_name || "Welcome"}
        description={user.email ?? ""}
      />
      <section className="section">
        <div className="container">
          <div className="form-layout">
            <div className="form-aside">
              <h2>Access</h2>
              {roles.length === 0 && (
                <p>
                  You have no access yet. Request the role that fits you; an administrator will
                  review it.
                </p>
              )}
              {roles.map((r) => (
                <p key={r.id}>
                  <strong className="capitalize">{r.role}</strong> —{" "}
                  {r.status === "active" ? "approved" : r.status}
                </p>
              ))}
              <div className="hero-actions">
                {!roles.some((r) => r.role === "mentor") && (
                  <Button variant="outline" onClick={() => request("mentor")}>
                    Request mentor access
                  </Button>
                )}
                {!roles.some((r) => r.role === "student") && (
                  <Button variant="outline" onClick={() => request("student")}>
                    Request student access
                  </Button>
                )}
              </div>
              {!isAdmin && user.email?.toLowerCase() === ADMIN_EMAIL && (
                <Button className="mt-6" onClick={claimAdmin}>
                  Set up administrator access
                </Button>
              )}
              {isAdmin && (
                <p>
                  <Link to="/admin" className="text-link">
                    Open central administrator dashboard →
                  </Link>
                </p>
              )}
              {msg && (
                <div role="status" className="form-status mt-6">
                  {msg}
                </div>
              )}
              <Button variant="ghost" className="mt-6" onClick={signOut}>
                Sign out
              </Button>
            </div>

            <form
              className="form-panel"
              onSubmit={(e) => {
                e.preventDefault();
                saveProfile(e.currentTarget);
              }}
            >
              <h2>Account contact profile</h2>
              <div className="form-grid">
                <label className="field wide">
                  Full name
                  <input
                    name="display_name"
                    maxLength={120}
                    defaultValue={profile?.display_name ?? ""}
                  />
                </label>
                <label className="field">
                  Phone
                  <input name="phone" maxLength={40} defaultValue={profile?.phone ?? ""} />
                </label>
                <label className="field">
                  Location
                  <input name="location" maxLength={160} defaultValue={profile?.location ?? ""} />
                </label>
              </div>
              <Button type="submit" className="w-full mt-6">
                Save profile
              </Button>
            </form>
          </div>

          {isMentor && <MentorWorkspace userId={user.id} userEmail={user.email ?? ""} />}
          {isStudent && <StudentWorkspace userId={user.id} />}
        </div>
      </section>
    </>
  );
}
