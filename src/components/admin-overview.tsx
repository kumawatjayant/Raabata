import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  GraduationCap,
  IndianRupee,
  Search,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentProfileDetail } from "@/components/student-profile-detail";
import {
  registerNewStudentProfile,
  saveAcademicProfile,
  type StudentAcademicProfile,
} from "@/lib/academic-profiles";
import type { RoleRow } from "@/lib/access";
import type { AdminEnquiryItem } from "@/lib/enquiries.functions";
import {
  calculateFundSummary,
  formatINR,
  uploadPlatformFile,
  type FundAllocationRow,
  type FundAuditLogRow,
  type FundDonationRow,
  type RecordedLectureRow,
  type StudentRecordRow,
} from "@/lib/platform";

export type AdminSectionId =
  "overview" | "academics" | "database" | "access" | "lectures" | "funds" | "stories";

export function AdminExecutiveOverview({
  roles,
  students,
  academicProfiles,
  lectures,
  donations,
  allocations,
  auditLogs,
  enquiries,
  onNavigate,
  onOpenStudent,
}: {
  roles: RoleRow[];
  students: StudentRecordRow[];
  academicProfiles: StudentAcademicProfile[];
  lectures: RecordedLectureRow[];
  donations: FundDonationRow[];
  allocations: FundAllocationRow[];
  auditLogs: FundAuditLogRow[];
  enquiries: AdminEnquiryItem[];
  onNavigate: (section: AdminSectionId) => void;
  onOpenStudent: (studentId: string) => void;
}) {
  const fundSummary = calculateFundSummary(donations, allocations);
  const activeMentors = roles.filter((r) => r.role === "mentor" && r.status === "active").length;
  const pendingRequests = roles.filter((r) => r.status === "pending").length;
  const avgAcademic =
    academicProfiles.length > 0
      ? Math.round(
          academicProfiles.reduce((s, p) => s + p.overallPercentage, 0) / academicProfiles.length,
        )
      : 0;
  const avgAttendance =
    academicProfiles.length > 0
      ? Math.round(
          academicProfiles.reduce((s, p) => s + p.attendancePercentage, 0) /
            academicProfiles.length,
        )
      : 0;

  return (
    <div className="space-y-8">
      <div className="stat-cards">
        <article className="stat-card">
          <div className="stat-label">
            <GraduationCap size={14} /> Academic Cohort
          </div>
          <div className="stat-value">{academicProfiles.length || students.length}</div>
          <small className="stat-note">
            Avg score {avgAcademic}% · Avg attendance {avgAttendance}%
          </small>
        </article>

        <article className="stat-card">
          <div className="stat-label">
            <Users size={14} /> Active Mentors
          </div>
          <div className="stat-value">{activeMentors}</div>
          <small className="stat-note">
            {pendingRequests} pending role {pendingRequests === 1 ? "request" : "requests"} ·{" "}
            {enquiries.length} enquiries
          </small>
        </article>

        <article className="stat-card">
          <div className="stat-label">
            <IndianRupee size={14} /> Funds Received
          </div>
          <div className="stat-value">{formatINR(fundSummary.totalReceivedInr)}</div>
          <small className="stat-note">
            Available balance: {formatINR(fundSummary.availableBalanceInr)}
          </small>
        </article>

        <article className="stat-card">
          <div className="stat-label">
            <Video size={14} /> Recorded Lectures
          </div>
          <div className="stat-value">{lectures.length}</div>
          <small className="stat-note">
            {lectures.filter((l) => l.is_published).length} published to students
          </small>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="form-panel">
          <div className="section-head mb-4">
            <div>
              <div className="eyebrow">Academic cohort</div>
              <h2>Student progress snapshot</h2>
            </div>
            <button type="button" className="text-link" onClick={() => onNavigate("academics")}>
              Open full directory <ArrowRight size={14} />
            </button>
          </div>
          {academicProfiles.length === 0 ? (
            <div className="empty-state">No student academic profiles created yet.</div>
          ) : (
            <div className="space-y-3">
              {academicProfiles.slice(0, 5).map((st) => (
                <div key={st.studentId} className="ledger-row" style={{ padding: 14 }}>
                  <div className="min-w-0">
                    <div className="ledger-badges">
                      <span className="pill-badge pill-green">{st.studentCode}</span>
                      <span className="pill-badge">{st.classGrade}</span>
                    </div>
                    <strong className="block mt-1.5 text-sm">{st.fullName}</strong>
                    <span className="text-xs text-muted-foreground">
                      Academic: {st.overallPercentage}% ({st.progressTier}) · Attendance:{" "}
                      {st.attendancePercentage}%
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onOpenStudent(st.studentId)}>
                    Inspect <ArrowRight size={13} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="form-panel">
          <div className="section-head mb-4">
            <div>
              <div className="eyebrow">Transparency ledger</div>
              <h2>Fund allocation breakdown</h2>
            </div>
            <button type="button" className="text-link" onClick={() => onNavigate("funds")}>
              Manage funds &amp; proofs <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {fundSummary.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{cat.category}</span>
                  <span>
                    <strong>{formatINR(cat.spentInr)}</strong> spent ·{" "}
                    <span className="text-muted-foreground">
                      {formatINR(cat.plannedInr)} planned
                    </span>
                  </span>
                </div>
                <div className="fund-bar">
                  <div className="fund-bar-fill" style={{ width: `${cat.sharePercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="form-panel">
          <div className="eyebrow">Quick actions</div>
          <h2>Common administrative workflows</h2>
          <div className="grid gap-2.5 sm:grid-cols-2 mt-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onNavigate("academics")}
            >
              <UserPlus size={15} /> Register / Track Student
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onNavigate("funds")}>
              <FileText size={15} /> Upload Bill / Fund Proof
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onNavigate("lectures")}
            >
              <Video size={15} /> Publish Recorded Lecture
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onNavigate("stories")}
            >
              <Award size={15} /> Publish Story / Photo
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onNavigate("database")}
            >
              <Users size={15} /> Assign Mentor to Student
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onNavigate("access")}
            >
              <CheckCircle2 size={15} /> Review Enquiries &amp; Roles
            </Button>
          </div>
        </section>

        <section className="form-panel">
          <div className="eyebrow">Governance &amp; audit trail</div>
          <h2>Recent financial audit entries</h2>
          {auditLogs.length === 0 ? (
            <div className="empty-state mt-4">No audit trail entries recorded yet.</div>
          ) : (
            <div className="mt-4 space-y-2">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="text-xs border rounded-lg p-3 bg-muted/40">
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span className="font-semibold text-primary">{log.action}</span>
                    <span>{new Date(log.created_at).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div>{log.summary}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function AdminEmbeddedAcademicsPanel({
  profiles,
  userId,
  initialSelectedId,
  onStatus,
}: {
  profiles: StudentAcademicProfile[];
  userId: string;
  initialSelectedId: string | null;
  onStatus: (msg: string, isErr?: boolean) => void;
}) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All classes");
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = profiles.find((p) => p.studentId === selectedId) ?? null;
  const classOptions = ["All classes", ...Array.from(new Set(profiles.map((p) => p.classGrade)))];

  const filtered = profiles.filter((p) => {
    const hay = `${p.fullName} ${p.studentCode} ${p.schoolName}`.toLowerCase();
    return (
      hay.includes(search.toLowerCase()) &&
      (classFilter === "All classes" || p.classGrade === classFilter)
    );
  });

  async function handleSave(updated: StudentAcademicProfile) {
    await saveAcademicProfile(updated, userId);
    await qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    await qc.invalidateQueries({ queryKey: ["student-academic-profiles"] });
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const v = Object.fromEntries(formData) as Record<string, string>;
    setBusy(true);
    try {
      let photoUrl = (v["photoUrl"] ?? "").trim() || null;
      const photoFile = formData.get("photoFile");
      if (photoFile instanceof File && photoFile.size > 0) {
        const res = await uploadPlatformFile("community-media", photoFile, "student-photos");
        photoUrl = res.url;
      }
      const ageVal = (v["age"] ?? "").trim();
      const created = await registerNewStudentProfile(
        {
          fullName: (v["fullName"] ?? "").trim(),
          age: ageVal ? Number(ageVal) : null,
          classGrade: (v["classGrade"] ?? "").trim() || "Class 6",
          schoolName: (v["schoolName"] ?? "").trim(),
          preferredLanguage: (v["preferredLanguage"] ?? "").trim() || "Hindi and English",
          subjectsEnrolled: (v["subjectsEnrolled"] ?? "English, Mathematics")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          guardianName: (v["guardianName"] ?? "").trim() || null,
          guardianEmail: (v["guardianEmail"] ?? "").trim(),
          guardianPhone: (v["guardianPhone"] ?? "").trim() || null,
          joinedDate: (v["joinedDate"] ?? "").trim() || new Date().toISOString().slice(0, 10),
          educationalGoals: (v["educationalGoals"] ?? "").trim(),
          photoUrl,
        },
        userId,
      );
      form.reset();
      setShowAdd(false);
      setSelectedId(created.studentId);
      onStatus(`Created profile ${created.studentCode} for ${created.fullName}.`);
      await qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      await qc.invalidateQueries({ queryKey: ["student-academic-profiles"] });
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Could not create student profile.", true);
    } finally {
      setBusy(false);
    }
  }

  if (selected) {
    return (
      <StudentProfileDetail
        profile={selected}
        viewerRole="admin"
        onSaveProfile={handleSave}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="section-head">
        <div>
          <h2>Student Academic Profiles ({filtered.length})</h2>
          <p className="section-copy">
            Open any student to record examination marks, update the attendance calendar, review
            holistic skill development, or export a PDF Progress Report.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <UserPlus size={15} /> {showAdd ? "Close registration" : "Register new student"}
        </Button>
      </div>

      {showAdd && (
        <form className="form-panel" onSubmit={handleCreate}>
          <h2>Register New Student Profile</h2>
          <div className="form-grid">
            <label className="field">
              Full Name *
              <input name="fullName" required maxLength={120} />
            </label>
            <label className="field">
              Age
              <input name="age" type="number" min={3} max={30} />
            </label>
            <label className="field">
              Class / Grade *
              <input name="classGrade" required maxLength={40} placeholder="e.g. Class 7" />
            </label>
            <label className="field">
              School Name *
              <input name="schoolName" required maxLength={200} />
            </label>
            <label className="field">
              Guardian Name
              <input name="guardianName" maxLength={120} />
            </label>
            <label className="field">
              Guardian Email *
              <input name="guardianEmail" type="email" required maxLength={255} />
            </label>
            <label className="field">
              Guardian Phone
              <input name="guardianPhone" maxLength={40} />
            </label>
            <label className="field">
              Optional Photo
              <input name="photoFile" type="file" accept="image/*" />
            </label>
            <label className="field wide">
              Subjects Enrolled (comma separated) *
              <input
                name="subjectsEnrolled"
                required
                defaultValue="English, Mathematics, Science"
              />
            </label>
            <label className="field wide">
              Educational Goals
              <textarea name="educationalGoals" />
            </label>
          </div>
          <Button type="submit" className="mt-5" disabled={busy}>
            {busy ? "Creating…" : "Create Academic Profile"}
          </Button>
        </form>
      )}

      <div className="filters" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search student profiles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, Student ID or school…"
          />
        </div>
        <select
          aria-label="Filter by class"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          {classOptions.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="student-dir-grid">
        {filtered.map((st) => (
          <article key={st.studentId} className="student-card">
            <div className="flex items-start gap-3">
              <div className="student-avatar student-avatar-fallback" aria-hidden="true">
                {st.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="ledger-badges">
                  <span className="pill-badge pill-green">{st.studentCode}</span>
                  <span className="pill-badge">{st.classGrade}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold truncate">{st.fullName}</h3>
                <p className="text-xs text-muted-foreground truncate">{st.schoolName}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Academic Avg</span>
                <strong>
                  {st.overallPercentage}% · {st.progressTier}
                </strong>
              </div>
              <div className="fund-bar">
                <div className="fund-bar-fill" style={{ width: `${st.overallPercentage}%` }} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attendance</span>
                <strong>{st.attendancePercentage}%</strong>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setSelectedId(st.studentId)}
            >
              Manage Academic Record <ArrowRight size={13} />
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
