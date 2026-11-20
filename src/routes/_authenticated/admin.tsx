import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Award, Database, IndianRupee, ShieldCheck, Users, Video } from "lucide-react";
import { PageHeading } from "@/components/site-shell";
import { AdminAccessAndEnquiriesPanel, AdminDatabasePanel } from "@/components/admin-directory";
import {
  AdminFundsPanel,
  AdminLecturesPanel,
  AdminStoriesAndPhotosPanel,
} from "@/components/admin-content";
import { supabase } from "@/integrations/supabase/client";
import type { RoleRow } from "@/lib/access";
import { listEnquiriesForAdmin, type AdminEnquiryItem } from "@/lib/enquiries.functions";
import { getLocalDevSession, readLocalDb, shouldUseLocalMode } from "@/lib/local-store";
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
    meta: [{ title: "Administrator | Rabata" }, { name: "robots", content: "noindex" }],
  }),
  component: Admin,
});

type AdminTab = "access" | "database" | "lectures" | "funds" | "stories";

function Admin() {
  const [tab, setTab] = useState<AdminTab>("access");
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
        return {
          isAdmin: true,
          isLocal: true,
          userId: localSession.userId,
          roles: db.user_roles,
          names: Object.fromEntries(db.app_profiles.map((p) => [p.user_id, p.display_name])),
          enquiries: [] as AdminEnquiryItem[],
          mentors: db.mentor_profiles,
          students: db.student_records,
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
        <div className="container">Loading administrator dashboard…</div>
      </section>
    );
  }

  if (!q.data.isAdmin) {
    return (
      <section className="section">
        <div className="container">
          <h2>Administrators only</h2>
          <p className="section-copy">Your account does not have administrator access.</p>
          <Link to="/account" className="text-link mt-4">
            Back to my account
          </Link>
        </div>
      </section>
    );
  }

  const d = q.data;
  const countRole = (role: string, status: string) =>
    d.roles.filter((r) => r.role === role && r.status === status).length;

  return (
    <>
      <PageHeading
        eyebrow={d.isLocal ? "Central administrator (Local Preview)" : "Central administrator"}
        title="Rabata command dashboard"
        description="Manage account approvals, mentor & student databases, recorded lectures, fund transparency proofs, success stories and homepage gallery photos."
      />
      <section className="section">
        <div className="container">
          <div className="trust-banner mb-6 justify-between flex-wrap">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} />
              <div>
                <strong>Central Admin Protection:</strong> Verified via administrator role check.
                {d.isLocal
                  ? " Running in localhost preview store until migration 0003 is applied to Lovable Cloud."
                  : " All totals and records below reflect live database entries."}
              </div>
            </div>
            <Link to="/students" className="text-link">
              Open Student Profiles &amp; Academic Progress System →
            </Link>
          </div>

          <div className="impact-mini mb-8">
            <div>
              <strong>{countRole("mentor", "active")}</strong>
              <span>approved mentors</span>
            </div>
            <div>
              <strong>{d.students.length}</strong>
              <span>student records</span>
            </div>
            <div>
              <strong>{d.roles.filter((r) => r.status === "pending").length}</strong>
              <span>pending requests</span>
            </div>
            <div>
              <strong>{d.enquiries.length}</strong>
              <span>private enquiries</span>
            </div>
          </div>

          {msg && (
            <div
              role={isErr ? "alert" : "status"}
              className={`form-status mb-6 ${isErr ? "form-error" : ""}`}
            >
              {msg}
            </div>
          )}

          <div className="admin-tabs" role="tablist" aria-label="Administrator sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "access"}
              className="tab-btn"
              onClick={() => setTab("access")}
            >
              <Users size={15} /> Access &amp; Enquiries
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "database"}
              className="tab-btn"
              onClick={() => setTab("database")}
            >
              <Database size={15} /> Mentors &amp; Students
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "lectures"}
              className="tab-btn"
              onClick={() => setTab("lectures")}
            >
              <Video size={15} /> Recorded Lectures
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "funds"}
              className="tab-btn"
              onClick={() => setTab("funds")}
            >
              <IndianRupee size={15} /> Funds &amp; Proofs
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "stories"}
              className="tab-btn"
              onClick={() => setTab("stories")}
            >
              <Award size={15} /> Stories &amp; Photos
            </button>
          </div>

          {tab === "access" && (
            <AdminAccessAndEnquiriesPanel
              roles={d.roles}
              names={d.names}
              enquiries={d.enquiries}
              onStatus={handleStatus}
            />
          )}
          {tab === "database" && (
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
          {tab === "lectures" && (
            <AdminLecturesPanel lectures={d.lectures} onStatus={handleStatus} />
          )}
          {tab === "funds" && (
            <AdminFundsPanel
              donations={d.donations}
              allocations={d.allocations}
              auditLogs={d.auditLogs}
              userId={d.userId}
              onStatus={handleStatus}
            />
          )}
          {tab === "stories" && (
            <AdminStoriesAndPhotosPanel
              stories={d.stories}
              photos={d.photos}
              userId={d.userId}
              onStatus={handleStatus}
            />
          )}
        </div>
      </section>
    </>
  );
}
