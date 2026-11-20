import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    meta: [{ title: "Member Portal | Rabata" }, { name: "robots", content: "noindex" }],
  }),
  component: Account,
});

type AccountTab = "overview" | "mentor" | "student";

function Account() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState<AccountTab | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        <div className="container">Loading portal…</div>
      </section>
    );
  }

  const { user, profile, roles, isLocal } = me.data;
  const isAdmin = roles.some((r) => r.role === "admin" && r.status === "active");
  const isMentor = roles.some((r) => r.role === "mentor" && r.status === "active");
  const isStudent = roles.some((r) => r.role === "student" && r.status === "active");

  const currentTab: AccountTab =
    activeTab ?? (isMentor ? "mentor" : isStudent ? "student" : "overview");

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
      setMsg("Preview account already has its role assigned.");
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

  const pageTitle =
    currentTab === "mentor"
      ? "Mentor Teaching Workspace"
      : currentTab === "student"
        ? "Student Learning Portal"
        : "Account & Access Control";

  return (
    <div className="console-shell">
      <div className="console-mobile-bar">
        <span className="text-sm font-semibold">Rabata Portal · {pageTitle}</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X size={15} /> : <Menu size={15} />} Menu
        </Button>
      </div>

      <aside
        className={`console-sidebar ${sidebarOpen ? "is-open" : ""}`}
        aria-label="Portal navigation"
      >
        <div className="console-brand-box">
          <span className="console-brand-tag">Rabata Member Portal</span>
          <div className="console-brand-title">{profile?.display_name || "Welcome"}</div>
          <div className="text-[11px] opacity-70 truncate mt-1">{user.email}</div>
        </div>

        <div className="console-nav-group">My Workspace</div>
        <nav className="console-nav">
          {isMentor && (
            <button
              type="button"
              className="console-nav-item"
              aria-current={currentTab === "mentor" ? "page" : undefined}
              onClick={() => {
                setActiveTab("mentor");
                setSidebarOpen(false);
              }}
            >
              <span className="console-nav-left">
                <Users size={16} />
                <span>Mentor Workspace</span>
              </span>
            </button>
          )}
          {isStudent && (
            <button
              type="button"
              className="console-nav-item"
              aria-current={currentTab === "student" ? "page" : undefined}
              onClick={() => {
                setActiveTab("student");
                setSidebarOpen(false);
              }}
            >
              <span className="console-nav-left">
                <BookOpen size={16} />
                <span>My Learning</span>
              </span>
            </button>
          )}
          <button
            type="button"
            className="console-nav-item"
            aria-current={currentTab === "overview" ? "page" : undefined}
            onClick={() => {
              setActiveTab("overview");
              setSidebarOpen(false);
            }}
          >
            <span className="console-nav-left">
              <User size={16} />
              <span>Account &amp; Profile</span>
            </span>
          </button>
        </nav>

        <div className="console-nav-group mt-3">Quick Shortcuts</div>
        <div className="console-nav">
          <Link to="/students" className="console-sidebar-link">
            <GraduationCap size={15} /> Student Academic Profiles
          </Link>
          <Link to="/learn" className="console-sidebar-link">
            <BookOpen size={15} /> Recorded Lectures
          </Link>
          {isAdmin && (
            <Link to="/admin" className="console-sidebar-link" style={{ color: "var(--gold)" }}>
              <LayoutDashboard size={15} /> Open Central Admin Console
            </Link>
          )}
        </div>

        <div className="console-sidebar-footer">
          <Link to="/" className="console-sidebar-link">
            <ExternalLink size={14} /> Public Website
          </Link>
          <button type="button" className="console-sidebar-link" onClick={signOut}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="console-main">
        <header className="console-topbar">
          <div>
            <h1>{pageTitle}</h1>
            <p>Role-scoped access protected by Row-Level Security · {user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="pill-badge pill-green">
              <ShieldCheck size={12} />{" "}
              {isAdmin
                ? "Administrator"
                : isMentor
                  ? "Approved Mentor"
                  : isStudent
                    ? "Approved Student"
                    : "Pending Review"}
            </span>
            {isAdmin && (
              <Button asChild size="sm">
                <Link to="/admin">Central Admin Console →</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/">
                <ExternalLink size={13} /> Public Website
              </Link>
            </Button>
          </div>
        </header>

        <div className="console-content">
          {currentTab === "overview" && (
            <div className="form-layout">
              <div className="form-panel">
                <h2>Access &amp; Roles</h2>
                {roles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    You have no role access yet. Request the role that fits you; an administrator
                    will review it.
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {roles.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-xs border rounded-lg p-3"
                    >
                      <strong className="capitalize">{r.role}</strong>
                      <span className={`pill-badge ${r.status === "active" ? "pill-green" : ""}`}>
                        {r.status === "active" ? "approved" : r.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="hero-actions mt-5">
                  {!roles.some((r) => r.role === "mentor") && (
                    <Button variant="outline" size="sm" onClick={() => request("mentor")}>
                      Request mentor access
                    </Button>
                  )}
                  {!roles.some((r) => r.role === "student") && (
                    <Button variant="outline" size="sm" onClick={() => request("student")}>
                      Request student access
                    </Button>
                  )}
                </div>
                {!isAdmin && user.email?.toLowerCase() === ADMIN_EMAIL && (
                  <Button className="mt-5 w-full" onClick={claimAdmin}>
                    Set up administrator access
                  </Button>
                )}
                {msg && (
                  <div role="status" className="form-status mt-5">
                    {msg}
                  </div>
                )}
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
          )}

          {currentTab === "mentor" && isMentor && (
            <MentorWorkspace userId={user.id} userEmail={user.email ?? ""} />
          )}

          {currentTab === "student" && isStudent && <StudentWorkspace userId={user.id} />}
        </div>
      </div>
    </div>
  );
}
