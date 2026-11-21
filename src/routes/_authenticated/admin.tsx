import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Database,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminAccessAndEnquiriesPanel, AdminDatabasePanel } from "@/components/admin-directory";
import {
  AdminFundsPanel,
  AdminLecturesPanel,
  AdminStoriesAndPhotosPanel,
} from "@/components/admin-content";
import {
  AdminEmbeddedAcademicsPanel,
  AdminExecutiveOverview,
  type AdminSectionId,
} from "@/components/admin-overview";
import { supabase } from "@/integrations/supabase/client";
import type { RoleRow } from "@/lib/access";
import { fetchAccessibleStudentProfiles } from "@/lib/academic-profiles";
import { listEnquiriesForAdmin, type AdminEnquiryItem } from "@/lib/enquiries.functions";
import {
  getLocalDevSession,
  isLocalDevHost,
  readLocalDb,
  readLocalEnquiries,
  setLocalDevSession,
  shouldUseLocalMode,
} from "@/lib/local-store";
import {
  formatINR,
  type ActivityPhotoRow,
  type AssignmentRow,
  type FundAllocationRow,
  type FundAuditLogRow,
  type FundDonationRow,
  type MentorProfileRow,
  type ProgressLogRow,
  type RecordedLectureRow,
  type StudentRecordRow,
  type SuccessStoryRow,
} from "@/lib/platform";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Administrator Console | Rabata" }, { name: "robots", content: "noindex" }],
  }),
  component: Admin,
});

const SECTION_META: Record<AdminSectionId, { title: string; subtitle: string }> = {
  overview: {
    title: "Executive Overview",
    subtitle:
      "Organization-wide summary across students, mentors, lectures, and transparent funds.",
  },
  academics: {
    title: "Student Academic Profiles",
    subtitle:
      "Manage individual marks, monthly progress graphs, attendance calendars, goals & PDF reports.",
  },
  database: {
    title: "Mentors & Student Roster",
    subtitle: "Manage mentor profiles, student assignments, and classroom attendance logs.",
  },
  access: {
    title: "Recent Calls & Enquiries",
    subtitle:
      "Listen & read recent helpline call transcripts (+91 79654 81661), handle website enquiries, and approve accounts.",
  },
  lectures: {
    title: "Recorded Lectures Studio",
    subtitle: "Upload or publish subject-wise and topic-wise educational video lessons.",
  },
  funds: {
    title: "Fund Transparency & Proofs",
    subtitle:
      "Record donations, publish expenditures with bill/receipt proofs, and inspect the audit trail.",
  },
  stories: {
    title: "Success Stories & Gallery",
    subtitle: "Publish safeguarding-verified learner journeys and homepage teaching photography.",
  },
};

function Admin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSectionId>("overview");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [cmdIndex, setCmdIndex] = useState(0);
  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);
  const fetchEnquiries = useServerFn(listEnquiriesForAdmin);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
        setCmdQuery("");
        setCmdIndex(0);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleStatus = (text: string, err = false) => {
    setMsg(text);
    setIsErr(err);
  };

  const q = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const localSession = getLocalDevSession();
      if (localSession) {
        if (localSession.role !== "admin") {
          return {
            isAdmin: false,
            isLocal: true,
            userId: localSession.userId,
            roles: [] as RoleRow[],
            names: {} as Record<string, string>,
            enquiries: [] as AdminEnquiryItem[],
            mentors: [] as MentorProfileRow[],
            students: [] as StudentRecordRow[],
            academicProfiles: [],
            assignments: [] as AssignmentRow[],
            logs: [] as ProgressLogRow[],
            lectures: [] as RecordedLectureRow[],
            donations: [] as FundDonationRow[],
            allocations: [] as FundAllocationRow[],
            auditLogs: [] as FundAuditLogRow[],
            stories: [] as SuccessStoryRow[],
            photos: [] as ActivityPhotoRow[],
          };
        }
        const db = readLocalDb();
        const academicProfiles = await fetchAccessibleStudentProfiles("admin", localSession.userId);
        return {
          isAdmin: true,
          isLocal: true,
          userId: localSession.userId,
          roles: db.user_roles,
          names: Object.fromEntries(db.app_profiles.map((p) => [p.user_id, p.display_name])),
          enquiries: readLocalEnquiries() as AdminEnquiryItem[],
          mentors: db.mentor_profiles,
          students: db.student_records,
          academicProfiles,
          assignments: db.mentor_student_assignments.filter((a) => a.active),
          logs: db.student_progress_logs,
          lectures: db.recorded_lectures,
          donations: db.fund_donations,
          allocations: db.fund_allocations,
          auditLogs: db.fund_audit_logs,
          stories: db.success_stories,
          photos: db.activity_photos,
        };
      }

      const { data: u } = await supabase.auth.getUser();
      const userId = u.user!.id;
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) {
        return {
          isAdmin: false,
          isLocal: false,
          userId,
          roles: [] as RoleRow[],
          names: {} as Record<string, string>,
          enquiries: [] as AdminEnquiryItem[],
          mentors: [] as MentorProfileRow[],
          students: [] as StudentRecordRow[],
          academicProfiles: [],
          assignments: [] as AssignmentRow[],
          logs: [] as ProgressLogRow[],
          lectures: [] as RecordedLectureRow[],
          donations: [] as FundDonationRow[],
          allocations: [] as FundAllocationRow[],
          auditLogs: [] as FundAuditLogRow[],
          stories: [] as SuccessStoryRow[],
          photos: [] as ActivityPhotoRow[],
        };
      }

      const [
        rolesRes,
        profilesRes,
        mentorsRes,
        studentsRes,
        assignmentsRes,
        logsRes,
        lecturesRes,
        donationsRes,
        allocationsRes,
        auditRes,
        storiesRes,
        photosRes,
        enquiriesResult,
        academicProfiles,
      ] = await Promise.all([
        supabase
          .from("user_roles")
          .select("id,user_id,role,status,requested_at")
          .order("requested_at", { ascending: false }),
        supabase.from("app_profiles").select("user_id,display_name"),
        supabase.from("mentor_profiles").select("*").order("updated_at", { ascending: false }),
        supabase.from("student_records").select("*").order("created_at", { ascending: false }),
        supabase
          .from("mentor_student_assignments")
          .select("*")
          .eq("active", true)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("student_progress_logs")
          .select("*")
          .order("session_date", { ascending: false })
          .limit(50),
        supabase.from("recorded_lectures").select("*").order("created_at", { ascending: false }),
        supabase.from("fund_donations").select("*").order("received_date", { ascending: false }),
        supabase.from("fund_allocations").select("*").order("entry_date", { ascending: false }),
        supabase
          .from("fund_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("success_stories").select("*").order("created_at", { ascending: false }),
        supabase.from("activity_photos").select("*").order("created_at", { ascending: false }),
        fetchEnquiries().catch(() => [] as AdminEnquiryItem[]),
        fetchAccessibleStudentProfiles("admin", userId),
      ]);

      const localFallback = shouldUseLocalMode(studentsRes.error) ? readLocalDb() : null;
      const mergedEnquiries = isLocalDevHost()
        ? [...readLocalEnquiries(), ...enquiriesResult]
        : enquiriesResult;

      return {
        isAdmin: true,
        isLocal: Boolean(localFallback),
        userId,
        roles: (rolesRes.data ?? []) as RoleRow[],
        names: Object.fromEntries(
          (profilesRes.data ?? []).map((p) => [p.user_id, p.display_name]),
        ) as Record<string, string>,
        enquiries: mergedEnquiries,
        mentors: (localFallback?.mentor_profiles ?? mentorsRes.data ?? []) as MentorProfileRow[],
        students: (localFallback?.student_records ?? studentsRes.data ?? []) as StudentRecordRow[],
        academicProfiles,
        assignments: (localFallback?.mentor_student_assignments ??
          assignmentsRes.data ??
          []) as AssignmentRow[],
        logs: (localFallback?.student_progress_logs ?? logsRes.data ?? []) as ProgressLogRow[],
        lectures: (localFallback?.recorded_lectures ??
          lecturesRes.data ??
          []) as RecordedLectureRow[],
        donations: (localFallback?.fund_donations ?? donationsRes.data ?? []) as FundDonationRow[],
        allocations: (localFallback?.fund_allocations ??
          allocationsRes.data ??
          []) as FundAllocationRow[],
        auditLogs: (localFallback?.fund_audit_logs ?? auditRes.data ?? []) as FundAuditLogRow[],
        stories: (localFallback?.success_stories ?? storiesRes.data ?? []) as SuccessStoryRow[],
        photos: (localFallback?.activity_photos ?? photosRes.data ?? []) as ActivityPhotoRow[],
      };
    },
  });

  const commandItems = useMemo(() => {
    const data = q.data;
    if (!data || !data.isAdmin) return [];
    const list: Array<{
      id: string;
      group: string;
      label: string;
      meta: string;
      run: () => void;
    }> = [
      ...(Object.keys(SECTION_META) as AdminSectionId[]).map((id) => ({
        id: `sec-${id}`,
        group: "Console Sections",
        label: SECTION_META[id].title,
        meta: "Workspace view",
        run: () => {
          setSection(id);
          setSidebarOpen(false);
          setMsg("");
        },
      })),
      ...data.academicProfiles.map((p) => ({
        id: `stu-${p.studentId}`,
        group: "Students",
        label: `${p.fullName} (${p.studentCode})`,
        meta: `${p.classGrade} · ${p.overallPercentage}%`,
        run: () => {
          setSelectedStudentId(p.studentId);
          setSection("academics");
          setSidebarOpen(false);
        },
      })),
      ...data.mentors.map((m) => ({
        id: `men-${m.user_id}`,
        group: "Mentors",
        label: m.full_name,
        meta: m.subjects || "Mentor",
        run: () => {
          setSection("database");
          setSidebarOpen(false);
        },
      })),
      ...data.lectures.map((l) => ({
        id: `lec-${l.id}`,
        group: "Recorded Lectures",
        label: l.title,
        meta: `${l.subject} · ${l.topic}`,
        run: () => {
          setSection("lectures");
          setSidebarOpen(false);
        },
      })),
      ...data.allocations.map((a) => ({
        id: `fund-${a.id}`,
        group: "Fund Ledger",
        label: a.title,
        meta: `${a.category} · ${formatINR(Number(a.amount_inr))}`,
        run: () => {
          setSection("funds");
          setSidebarOpen(false);
        },
      })),
      {
        id: "route-home",
        group: "Quick Navigation",
        label: "Open Public Website",
        meta: "/",
        run: () => navigate({ to: "/" }),
      },
      {
        id: "route-students",
        group: "Quick Navigation",
        label: "Public Student Directory",
        meta: "/students",
        run: () => navigate({ to: "/students" }),
      },
      {
        id: "route-funds",
        group: "Quick Navigation",
        label: "Public Fund Transparency Ledger",
        meta: "/funds",
        run: () => navigate({ to: "/funds" }),
      },
    ];
    const query = cmdQuery.trim().toLowerCase();
    if (!query) return list.slice(0, 12);
    return list
      .filter((item) => `${item.label} ${item.meta} ${item.group}`.toLowerCase().includes(query))
      .slice(0, 14);
  }, [cmdQuery, navigate, q.data]);

  if (q.isLoading || !q.data) {
    return (
      <section className="section">
        <div className="container">Loading administrator console…</div>
      </section>
    );
  }

  if (!q.data.isAdmin) {
    return (
      <section className="section">
        <div className="container">
          <div className="form-panel" style={{ maxWidth: 520, marginInline: "auto" }}>
            <h2>Administrators only</h2>
            <p className="section-copy">
              Your current session does not have central administrator access.
            </p>
            <div className="mt-5 flex gap-3">
              <Button asChild>
                <Link to="/account">Back to my account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/auth">Switch account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const d = q.data;
  const pendingCount = d.roles.filter((r) => r.status === "pending").length;
  const activeMeta = SECTION_META[section];

  async function signOut() {
    setLocalDevSession(null);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut().catch(() => {});
    navigate({ to: "/auth", replace: true });
  }

  function selectNav(target: AdminSectionId) {
    setSection(target);
    setSidebarOpen(false);
    setMsg("");
  }

  const navItems: Array<{
    group: string;
    id: AdminSectionId;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }> = [
    { group: "Workspace", id: "overview", label: "Executive Overview", icon: LayoutDashboard },
    {
      group: "Workspace",
      id: "academics",
      label: "Student Academic Profiles",
      icon: GraduationCap,
      badge: d.academicProfiles.length,
    },
    {
      group: "Workspace",
      id: "database",
      label: "Mentors & Roster",
      icon: Database,
      badge: d.students.length,
    },
    {
      group: "Operations",
      id: "access",
      label: "Calls & Enquiries",
      icon: UserCheck,
      badge: pendingCount + d.enquiries.length,
    },
    {
      group: "Operations",
      id: "lectures",
      label: "Recorded Lectures",
      icon: Video,
      badge: d.lectures.length,
    },
    {
      group: "Governance",
      id: "funds",
      label: "Fund Ledger & Proofs",
      icon: IndianRupee,
      badge: d.allocations.length,
    },
    {
      group: "Governance",
      id: "stories",
      label: "Stories & Gallery",
      icon: Award,
      badge: d.stories.length + d.photos.length,
    },
  ];

  const groups = ["Workspace", "Operations", "Governance"];

  return (
    <div className="console-shell">
      <div className="console-mobile-bar">
        <span className="text-sm font-semibold">Rabata Admin Console · {activeMeta.title}</span>
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
        aria-label="Admin navigation"
      >
        <div className="console-brand-box">
          <span className="console-brand-tag">Rabata Governance OS</span>
          <div className="console-brand-title">Central Admin Console</div>
        </div>

        {groups.map((grp) => (
          <div key={grp} className="mb-2">
            <div className="console-nav-group">{grp}</div>
            <nav className="console-nav">
              {navItems
                .filter((i) => i.group === grp)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="console-nav-item"
                      aria-current={section === item.id ? "page" : undefined}
                      onClick={() => selectNav(item.id)}
                    >
                      <span className="console-nav-left">
                        <Icon size={16} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.badge === "number" && (
                        <span className="console-badge">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
            </nav>
          </div>
        ))}

        <div className="console-sidebar-footer">
          <Link to="/" className="console-sidebar-link">
            <ExternalLink size={14} /> View Public Website
          </Link>
          <Link to="/funds" className="console-sidebar-link">
            <IndianRupee size={14} /> Public Fund Ledger
          </Link>
          <Link to="/account" className="console-sidebar-link">
            <Users size={14} /> My Account Settings
          </Link>
          <button type="button" className="console-sidebar-link" onClick={signOut}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="console-main">
        <header className="console-topbar">
          <div>
            <h1>{activeMeta.title}</h1>
            <p>{activeMeta.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="cmdk-trigger"
              onClick={() => {
                setCmdOpen(true);
                setCmdQuery("");
                setCmdIndex(0);
              }}
            >
              <Search size={13} /> Search &amp; Jump… <kbd>Ctrl K</kbd>
            </button>
            <span className="pill-badge pill-green">
              <ShieldCheck size={12} />{" "}
              {d.isLocal ? "Preview Mode · RLS Simulation" : "Admin Verified · RLS Active"}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/students">Directory View</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/">
                <ExternalLink size={13} /> Public Site
              </Link>
            </Button>
          </div>
        </header>

        {cmdOpen && (
          <div
            className="cmdk-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Quick command palette"
            onClick={() => setCmdOpen(false)}
          >
            <div className="cmdk-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cmdk-head">
                <Search size={16} className="text-muted-foreground" />
                <input
                  autoFocus
                  className="cmdk-input"
                  placeholder="Jump to student (e.g. Aarav, RBT-2026-001), mentor, lecture or ledger item…"
                  value={cmdQuery}
                  onChange={(e) => {
                    setCmdQuery(e.target.value);
                    setCmdIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setCmdIndex((i) => Math.min(commandItems.length - 1, i + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setCmdIndex((i) => Math.max(0, i - 1));
                    } else if (e.key === "Enter" && commandItems[cmdIndex]) {
                      e.preventDefault();
                      commandItems[cmdIndex]!.run();
                      setCmdOpen(false);
                    }
                  }}
                />
                <Button size="sm" variant="ghost" onClick={() => setCmdOpen(false)}>
                  Esc
                </Button>
              </div>
              <div className="cmdk-list">
                {commandItems.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground text-center">
                    No matching sections, students, mentors or ledger items found.
                  </div>
                ) : (
                  commandItems.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`cmdk-item ${idx === cmdIndex ? "is-selected" : ""}`}
                      onClick={() => {
                        item.run();
                        setCmdOpen(false);
                      }}
                    >
                      <span className="truncate font-medium">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {item.group} · {item.meta}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="console-content">
          {msg && (
            <div
              role={isErr ? "alert" : "status"}
              className={`form-status mb-6 ${isErr ? "form-error" : ""}`}
            >
              {msg}
            </div>
          )}

          {section === "overview" && (
            <AdminExecutiveOverview
              roles={d.roles}
              students={d.students}
              academicProfiles={d.academicProfiles}
              lectures={d.lectures}
              donations={d.donations}
              allocations={d.allocations}
              auditLogs={d.auditLogs}
              enquiries={d.enquiries}
              onNavigate={(target) => selectNav(target)}
              onOpenStudent={(studentId) => {
                setSelectedStudentId(studentId);
                selectNav("academics");
              }}
            />
          )}

          {section === "academics" && (
            <AdminEmbeddedAcademicsPanel
              key={selectedStudentId ?? "dir"}
              profiles={d.academicProfiles}
              userId={d.userId}
              initialSelectedId={selectedStudentId}
              onStatus={handleStatus}
            />
          )}

          {section === "database" && (
            <AdminDatabasePanel
              roles={d.roles}
              names={d.names}
              mentors={d.mentors}
              students={d.students}
              assignments={d.assignments}
              logs={d.logs}
              onStatus={handleStatus}
            />
          )}

          {section === "access" && (
            <AdminAccessAndEnquiriesPanel
              roles={d.roles}
              names={d.names}
              enquiries={d.enquiries}
              onStatus={handleStatus}
            />
          )}

          {section === "lectures" && (
            <AdminLecturesPanel lectures={d.lectures} onStatus={handleStatus} />
          )}

          {section === "funds" && (
            <AdminFundsPanel
              donations={d.donations}
              allocations={d.allocations}
              auditLogs={d.auditLogs}
              userId={d.userId}
              onStatus={handleStatus}
            />
          )}

          {section === "stories" && (
            <AdminStoriesAndPhotosPanel
              stories={d.stories}
              photos={d.photos}
              userId={d.userId}
              onStatus={handleStatus}
            />
          )}
        </div>
      </div>
    </div>
  );
}
