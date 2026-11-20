import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Award,
  Database,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
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
  readLocalDb,
  setLocalDevSession,
  shouldUseLocalMode,
} from "@/lib/local-store";
import type {
  ActivityPhotoRow,
  AssignmentRow,
  FundAllocationRow,
  FundAuditLogRow,
  FundDonationRow,
  MentorProfileRow,
  ProgressLogRow,
  RecordedLectureRow,
  StudentRecordRow,
  SuccessStoryRow,
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
    title: "Access Control & Enquiries",
    subtitle: "Review mentor/student account approvals and process private website enquiries.",
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
  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);
  const fetchEnquiries = useServerFn(listEnquiriesForAdmin);

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
          enquiries: [] as AdminEnquiryItem[],
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

      return {
        isAdmin: true,
        isLocal: Boolean(localFallback),
        userId,
        roles: (rolesRes.data ?? []) as RoleRow[],
        names: Object.fromEntries(
          (profilesRes.data ?? []).map((p) => [p.user_id, p.display_name]),
        ) as Record<string, string>,
        enquiries: enquiriesResult,
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
      label: "Access & Enquiries",
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
            <span className="pill-badge pill-green">
              <ShieldCheck size={12} />{" "}
              {d.isLocal ? "Preview Mode · RLS Simulation" : "Admin Verified · RLS Active"}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/students">Full Directory View</Link>
            </Button>
          </div>
        </header>

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
