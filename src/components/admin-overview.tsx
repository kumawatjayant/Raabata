import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  GraduationCap,
  IndianRupee,
  Plus,
  Search,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { AdminModal } from "@/components/admin-modal";
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
  formatClassLabel,
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
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All Tiers");

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

  const filteredSnapshot = academicProfiles.filter((st) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || `${st.fullName} ${st.studentCode} ${st.classGrade}`.toLowerCase().includes(q);
    const matchesTier = tierFilter === "All Tiers" || st.progressTier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
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
            {pendingRequests} pending {pendingRequests === 1 ? "request" : "requests"} ·{" "}
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

      <div className="admin-control-bar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search student progress snapshot"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name, ID, or class…"
          />
        </div>
        <select
          aria-label="Filter student snapshot by tier"
          className="admin-control-select"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="All Tiers">All Tiers ({academicProfiles.length})</option>
          <option value="Excellent">Excellent</option>
          <option value="Good">Good</option>
          <option value="Developing">Developing</option>
          <option value="Needs Support">Needs Support</option>
        </select>
        <div className="admin-control-actions">
          <button
            type="button"
            className="admin-action-btn admin-action-btn-secondary admin-toolbar-btn"
            onClick={() => onNavigate("academics")}
          >
            Open Directory <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Class</th>
              <th>Academic Avg</th>
              <th>Attendance</th>
              <th>Tier</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSnapshot.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  No student academic profiles match your filter.
                </td>
              </tr>
            ) : (
              filteredSnapshot.slice(0, 6).map((st) => (
                <tr key={st.studentId}>
                  <td className="whitespace-nowrap">
                    <span className="pill-badge pill-green">{st.studentCode}</span>
                  </td>
                  <td>
                    <strong>{st.fullName}</strong>
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatClassLabel(st.classGrade)}
                  </td>
                  <td className="whitespace-nowrap">
                    <strong>{st.overallPercentage}%</strong>
                  </td>
                  <td className="whitespace-nowrap">{st.attendancePercentage}%</td>
                  <td className="whitespace-nowrap">
                    <span className="pill-badge">{st.progressTier}</span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn-secondary"
                      onClick={() => onOpenStudent(st.studentId)}
                    >
                      Open <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <section className="admin-panel-card">
          <div className="admin-panel-card-head">
            <div>
              <div className="eyebrow">Transparency ledger</div>
              <h2>Fund allocation breakdown</h2>
            </div>
            <button type="button" className="text-link" onClick={() => onNavigate("funds")}>
              Manage funds <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3.5 mt-auto">
            {fundSummary.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex justify-between gap-3 text-xs">
                  <span className="font-medium truncate">{cat.category}</span>
                  <span className="whitespace-nowrap">
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

        <section className="admin-panel-card">
          <div className="admin-panel-card-head">
            <div>
              <div className="eyebrow">Quick actions</div>
              <h2>Common administrative workflows</h2>
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              className="admin-quick-btn"
              onClick={() => onNavigate("academics")}
            >
              <UserPlus size={15} /> Register / Track Student
            </button>
            <button type="button" className="admin-quick-btn" onClick={() => onNavigate("funds")}>
              <FileText size={15} /> Upload Bill / Fund Proof
            </button>
            <button
              type="button"
              className="admin-quick-btn"
              onClick={() => onNavigate("lectures")}
            >
              <Video size={15} /> Publish Recorded Lecture
            </button>
            <button type="button" className="admin-quick-btn" onClick={() => onNavigate("stories")}>
              <Award size={15} /> Publish Story / Photo
            </button>
            <button
              type="button"
              className="admin-quick-btn"
              onClick={() => onNavigate("database")}
            >
              <Users size={15} /> Assign Mentor to Student
            </button>
            <button type="button" className="admin-quick-btn" onClick={() => onNavigate("access")}>
              <CheckCircle2 size={15} /> Recent Calls &amp; Enquiries
            </button>
          </div>
          {auditLogs.length > 0 && (
            <div className="mt-auto pt-4 border-t">
              <div className="text-xs font-semibold mb-1.5 text-primary">
                Latest Financial Audit
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(auditLogs[0]!.created_at).toLocaleDateString("en-IN")} ·{" "}
                <strong>{auditLogs[0]!.action}</strong> · {auditLogs[0]!.summary}
              </div>
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = profiles.find((p) => p.studentId === selectedId) ?? null;

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
      setShowAddModal(false);
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

  const avgAcademic =
    profiles.length > 0
      ? Math.round(profiles.reduce((s, p) => s + p.overallPercentage, 0) / profiles.length)
      : 0;
  const avgAttendance =
    profiles.length > 0
      ? Math.round(profiles.reduce((s, p) => s + p.attendancePercentage, 0) / profiles.length)
      : 0;
  const needsSupportCount = profiles.filter((p) => p.progressTier === "Needs Support").length;
  const strongCount = profiles.filter(
    (p) => p.progressTier === "Good" || p.progressTier === "Excellent",
  ).length;
  const distinctClasses = Array.from(new Set(profiles.map((p) => p.classGrade)));

  return (
    <div className="space-y-6">
      <div className="stat-cards">
        <article className="stat-card">
          <div className="stat-label">
            <GraduationCap size={14} /> Total Students
          </div>
          <div className="stat-value">{profiles.length}</div>
          <small className="stat-note">Active academic profiles</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <Award size={14} /> Average Score
          </div>
          <div className="stat-value">{avgAcademic}%</div>
          <small className="stat-note">Across recorded assessments</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <CheckCircle2 size={14} /> Average Attendance
          </div>
          <div className="stat-value">{avgAttendance}%</div>
          <small className="stat-note">Across logged sessions</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <UserPlus size={14} /> Needs Support
          </div>
          <div className="stat-value">{needsSupportCount}</div>
          <small className="stat-note">{strongCount} Good or Excellent</small>
        </article>
      </div>

      <div className="admin-control-bar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search student profiles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, Student ID, or school…"
          />
        </div>
        <select
          aria-label="Filter by class"
          className="admin-control-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="All classes">All Classes ({profiles.length})</option>
          {distinctClasses.map((c) => (
            <option key={c} value={c}>
              {formatClassLabel(c)}
            </option>
          ))}
        </select>
        <div className="admin-control-actions">
          <button
            type="button"
            className="admin-action-btn admin-action-btn-primary admin-toolbar-btn"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={14} /> Register New Student
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>School</th>
              <th>Academic Avg</th>
              <th>Attendance</th>
              <th>Tier</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted-foreground py-8">
                  No student academic profiles match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((st) => (
                <tr key={st.studentId}>
                  <td className="whitespace-nowrap">
                    <span className="pill-badge pill-green">{st.studentCode}</span>
                  </td>
                  <td>
                    <strong>{st.fullName}</strong>
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatClassLabel(st.classGrade)}
                  </td>
                  <td className="text-xs text-muted-foreground">{st.schoolName}</td>
                  <td className="whitespace-nowrap">
                    <strong>{st.overallPercentage}%</strong>
                  </td>
                  <td className="whitespace-nowrap">{st.attendancePercentage}%</td>
                  <td className="whitespace-nowrap">
                    <span className="pill-badge">{st.progressTier}</span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn-secondary"
                      onClick={() => setSelectedId(st.studentId)}
                    >
                      Manage <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={showAddModal}
        title="Register New Student Profile"
        subtitle="Create a tracked academic record for marks, attendance, goals, and PDF progress cards."
        onClose={() => setShowAddModal(false)}
      >
        <form onSubmit={handleCreate}>
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
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create Academic Profile"}
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
