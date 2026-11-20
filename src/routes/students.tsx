import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, GraduationCap, Lock, Search, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/site-shell";
import { StudentProfileDetail } from "@/components/student-profile-detail";
import { supabase } from "@/integrations/supabase/client";
import { myRoles } from "@/lib/access";
import {
  fetchAccessibleStudentProfiles,
  registerNewStudentProfile,
  saveAcademicProfile,
  type StudentAcademicProfile,
  type ViewerRole,
} from "@/lib/academic-profiles";
import {
  getLocalDevSession,
  isLocalDevHost,
  setLocalDevSession,
  type LocalDevRoleKey,
} from "@/lib/local-store";
import { uploadPlatformFile } from "@/lib/platform";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/students")({
  head: () =>
    pageHead(
      "Student Profiles & Academic Progress",
      "Authorised Rabata directory for tracking personalised student profiles, subject marks, attendance, learning goals and printable PDF progress reports.",
    ),
  component: StudentsDirectoryPage,
});

function StudentsDirectoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All classes");
  const [progressFilter, setProgressFilter] = useState("All progress");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [busyCreate, setBusyCreate] = useState(false);
  const [msg, setMsg] = useState("");
  const [localHost, setLocalHost] = useState(false);

  useEffect(() => {
    setLocalHost(isLocalDevHost());
  }, []);

  const authQuery = useQuery({
    queryKey: ["students-viewer-auth"],
    queryFn: async (): Promise<{ role: ViewerRole; userId: string | null; label: string }> => {
      const local = getLocalDevSession();
      if (local) {
        return { role: local.role, userId: local.userId, label: local.displayName };
      }
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return { role: "anon", userId: null, label: "Signed out" };
      const roles = await myRoles(user.id);
      if (roles.some((r) => r.role === "admin" && r.status === "active")) {
        return { role: "admin", userId: user.id, label: user.email ?? "Administrator" };
      }
      if (roles.some((r) => r.role === "mentor" && r.status === "active")) {
        return { role: "mentor", userId: user.id, label: user.email ?? "Mentor" };
      }
      if (roles.some((r) => r.role === "student" && r.status === "active")) {
        return { role: "student", userId: user.id, label: user.email ?? "Student" };
      }
      return { role: "anon", userId: user.id, label: "Pending approval" };
    },
  });

  const viewerRole = authQuery.data?.role ?? "anon";
  const viewerUserId = authQuery.data?.userId ?? null;

  const profilesQuery = useQuery({
    queryKey: ["student-academic-profiles", viewerRole, viewerUserId],
    enabled: viewerRole !== "anon" && Boolean(viewerUserId),
    queryFn: () => fetchAccessibleStudentProfiles(viewerRole, viewerUserId),
  });

  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);

  const classOptions = useMemo(() => {
    const unique = new Set(profiles.map((p) => p.classGrade).filter(Boolean));
    return ["All classes", ...Array.from(unique)];
  }, [profiles]);

  const filtered = useMemo(
    () =>
      profiles.filter((p) => {
        const hay =
          `${p.fullName} ${p.studentCode} ${p.schoolName} ${p.subjectsEnrolled.join(" ")}`.toLowerCase();
        const matchSearch = hay.includes(search.toLowerCase());
        const matchClass = classFilter === "All classes" || p.classGrade === classFilter;
        const matchProgress =
          progressFilter === "All progress" || p.progressTier === progressFilter;
        return matchSearch && matchClass && matchProgress;
      }),
    [profiles, search, classFilter, progressFilter],
  );

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.studentId === selectedId) ?? null,
    [profiles, selectedId],
  );

  function switchPreviewRole(key: LocalDevRoleKey) {
    setLocalDevSession(key);
    setSelectedId(null);
    qc.invalidateQueries({ queryKey: ["students-viewer-auth"] });
    qc.invalidateQueries({ queryKey: ["student-academic-profiles"] });
  }

  async function handleSaveProfile(updated: StudentAcademicProfile) {
    await saveAcademicProfile(updated, viewerUserId);
    await qc.invalidateQueries({ queryKey: ["student-academic-profiles"] });
  }

  async function handleCreateStudent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const v = Object.fromEntries(formData) as Record<string, string>;
    setBusyCreate(true);
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
        viewerUserId,
      );
      form.reset();
      setShowAddForm(false);
      setMsg(`Created student profile ${created.studentCode} for ${created.fullName}.`);
      setSelectedId(created.studentId);
      await qc.invalidateQueries({ queryKey: ["student-academic-profiles"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not create student profile.");
    } finally {
      setBusyCreate(false);
    }
  }

  const avgAcademic =
    profiles.length > 0
      ? Math.round(profiles.reduce((s, p) => s + p.overallPercentage, 0) / profiles.length)
      : 0;
  const avgAttendance =
    profiles.length > 0
      ? Math.round(profiles.reduce((s, p) => s + p.attendancePercentage, 0) / profiles.length)
      : 0;
  const completedGoalsCount = profiles.reduce(
    (s, p) => s + p.learningGoals.filter((g) => g.status === "Completed").length,
    0,
  );

  return (
    <>
      <PageHeading
        eyebrow="Personalised student tracking"
        title="Student Profiles & Academic Progress"
        description="Maintain individual student profiles, subject-wise marks, attendance calendars, holistic skill development, teacher remarks, learning goals and downloadable PDF progress reports."
      />

      <section className="section">
        <div className="container">
          {localHost && (
            <div className="trust-banner mb-6 flex-wrap justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} />
                <div>
                  <strong>Authorised Showcase Role:</strong> Viewing as{" "}
                  <span className="capitalize font-semibold">
                    {authQuery.data?.label ?? "Signed out"}
                  </span>
                  . Switch roles below to demonstrate strict admin vs. mentor-to-mentor isolation
                  and guardian contact protection.
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  size="sm"
                  variant={viewerRole === "admin" ? "default" : "outline"}
                  onClick={() => switchPreviewRole("admin")}
                >
                  Admin (All Students + Contacts)
                </Button>
                <Button
                  size="sm"
                  variant={viewerUserId === "local-mentor-1" ? "default" : "outline"}
                  onClick={() => switchPreviewRole("mentor1")}
                >
                  Mentor 1 (Ananya)
                </Button>
                <Button
                  size="sm"
                  variant={viewerUserId === "local-mentor-2" ? "default" : "outline"}
                  onClick={() => switchPreviewRole("mentor2")}
                >
                  Mentor 2 (Rohan)
                </Button>
                <Button
                  size="sm"
                  variant={viewerRole === "student" ? "default" : "outline"}
                  onClick={() => switchPreviewRole("student")}
                >
                  Student (Aarav)
                </Button>
              </div>
            </div>
          )}

          {viewerRole === "anon" ? (
            <div className="form-panel text-center py-12">
              <Lock size={34} className="mx-auto text-leaf mb-3" />
              <h2>Authorised Access Only</h2>
              <p className="section-copy mx-auto">
                To protect children’s privacy and safeguarding, student academic profiles, marks and
                guardian contact details are accessible only to authorised Rabata administrators,
                assigned mentors and approved students.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link to="/auth">Sign in to Portal</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/student-registration">Register a New Student</Link>
                </Button>
              </div>
            </div>
          ) : selectedProfile ? (
            <StudentProfileDetail
              profile={selectedProfile}
              viewerRole={viewerRole}
              onSaveProfile={handleSaveProfile}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="space-y-8">
              <div className="stat-cards">
                <div className="stat-card">
                  <div className="stat-label">Enrolled Profiles</div>
                  <div className="stat-value">{profiles.length}</div>
                  <small className="stat-note">Visible to your role</small>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Academic Score</div>
                  <div className="stat-value">{avgAcademic}%</div>
                  <small className="stat-note">Across tracked subjects</small>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Attendance</div>
                  <div className="stat-value">{avgAttendance}%</div>
                  <small className="stat-note">Based on session calendars</small>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Goals Achieved</div>
                  <div className="stat-value">{completedGoalsCount}</div>
                  <small className="stat-note">Completed learning milestones</small>
                </div>
              </div>

              <div className="section-head">
                <div>
                  <div className="eyebrow">
                    <GraduationCap size={13} /> Student directory
                  </div>
                  <h2>Registered student profiles ({filtered.length})</h2>
                </div>
                {viewerRole === "admin" && (
                  <Button onClick={() => setShowAddForm(!showAddForm)}>
                    <UserPlus size={15} /> {showAddForm ? "Close form" : "Register new student"}
                  </Button>
                )}
              </div>

              {msg && (
                <div role="status" className="form-status">
                  {msg}
                </div>
              )}

              {showAddForm && viewerRole === "admin" && (
                <form className="form-panel" onSubmit={handleCreateStudent}>
                  <div className="eyebrow">New student profile</div>
                  <h2>Register student &amp; create academic profile</h2>
                  <div className="form-grid">
                    <label className="field">
                      Full Name *
                      <input
                        name="fullName"
                        required
                        maxLength={120}
                        placeholder="Student's full name"
                      />
                    </label>
                    <label className="field">
                      Age
                      <input name="age" type="number" min={3} max={30} placeholder="e.g. 12" />
                    </label>
                    <label className="field">
                      Class / Grade *
                      <input name="classGrade" required maxLength={40} placeholder="e.g. Class 7" />
                    </label>
                    <label className="field">
                      School Name *
                      <input
                        name="schoolName"
                        required
                        maxLength={200}
                        placeholder="e.g. Govt. Model School, Derabassi"
                      />
                    </label>
                    <label className="field">
                      Preferred Language
                      <select name="preferredLanguage" defaultValue="Hindi and English">
                        <option>Hindi and English</option>
                        <option>Hindi</option>
                        <option>English</option>
                        <option>Punjabi</option>
                      </select>
                    </label>
                    <label className="field">
                      Date of Joining Rabata
                      <input
                        name="joinedDate"
                        type="date"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                      />
                    </label>
                    <label className="field wide">
                      Subjects Enrolled (comma separated) *
                      <input
                        name="subjectsEnrolled"
                        required
                        defaultValue="English, Mathematics, Science"
                      />
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
                      Optional Photograph Upload
                      <input name="photoFile" type="file" accept="image/*" />
                    </label>
                    <label className="field wide">
                      Educational Goals
                      <textarea
                        name="educationalGoals"
                        placeholder="Key academic or communication objectives for this student…"
                      />
                    </label>
                  </div>
                  <Button type="submit" className="mt-5" disabled={busyCreate}>
                    {busyCreate ? "Creating profile…" : "Create student profile"}
                  </Button>
                </form>
              )}

              <div className="filters" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Search students by name, ID or school"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by student name, ID (e.g. RBT-2026-001), or school…"
                  />
                </div>
                <select
                  aria-label="Filter by class or grade"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  {classOptions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter by academic progress"
                  value={progressFilter}
                  onChange={(e) => setProgressFilter(e.target.value)}
                >
                  <option value="All progress">All progress levels</option>
                  <option value="Excellent">Excellent (80%+)</option>
                  <option value="Good">Good (65–79%)</option>
                  <option value="Improving">Improving (50–64%)</option>
                  <option value="Needs Support">Needs Support (&lt;50%)</option>
                </select>
              </div>

              {profilesQuery.isLoading ? (
                <div className="empty-state">Loading student profiles…</div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  No student profiles match your filters or role permissions.
                </div>
              ) : (
                <div className="student-dir-grid">
                  {filtered.map((student) => (
                    <article key={student.studentId} className="student-card">
                      <div className="flex items-start gap-4">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.fullName}
                            className="student-avatar"
                          />
                        ) : (
                          <div
                            className="student-avatar student-avatar-fallback"
                            aria-hidden="true"
                          >
                            {student.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="ledger-badges">
                            <span className="pill-badge pill-green">{student.studentCode}</span>
                            <span className="pill-badge">{student.classGrade}</span>
                          </div>
                          <h3 className="mt-2 text-lg font-semibold truncate">
                            {student.fullName}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {student.schoolName || "Rabata Community Learning"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {student.subjectsEnrolled.map((sub) => (
                          <span key={sub} className="pill-badge">
                            {sub}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Overall Academic Progress</span>
                          <strong>
                            {student.overallPercentage}% · {student.progressTier}
                          </strong>
                        </div>
                        <div className="fund-bar">
                          <div
                            className="fund-bar-fill"
                            style={{ width: `${student.overallPercentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-muted-foreground">Attendance</span>
                          <strong>{student.attendancePercentage}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Joined Rabata</span>
                          <span>{student.joinedDate}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full mt-5"
                        variant="outline"
                        onClick={() => setSelectedId(student.studentId)}
                      >
                        Open academic profile <ArrowRight size={14} />
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
