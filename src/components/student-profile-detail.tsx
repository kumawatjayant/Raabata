import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarCheck,
  ExternalLink,
  FileText,
  GraduationCap,
  Lock,
  MessageSquare,
  Printer,
  Target,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CoreCompetencyChart,
  MonthlyAttendanceCalendar,
  MonthlyPerformanceSvgChart,
  SubjectStrengthsChart,
} from "@/components/student-charts";
import {
  calculateSubjectPercentage,
  downloadStudentProgressReportPdf,
  ratingToSkillLevel,
  type AcademicDocumentItem,
  type AttendanceDayStatus,
  type GoalStatus,
  type LearningDevCategory,
  type LearningGoalItem,
  type MonthlyAssessmentItem,
  type StudentAcademicProfile,
  type SubjectPerformanceItem,
  type ViewerRole,
} from "@/lib/academic-profiles";
import { makeLocalId } from "@/lib/local-store";
import { uploadPlatformFile } from "@/lib/platform";

export function StudentProfileDetail({
  profile,
  viewerRole,
  onSaveProfile,
  onBack,
}: {
  profile: StudentAcademicProfile;
  viewerRole: ViewerRole;
  onSaveProfile: (updated: StudentAcademicProfile) => Promise<void>;
  onBack: () => void;
}) {
  const canEditAcademic = viewerRole === "admin" || viewerRole === "mentor";
  const isAdmin = viewerRole === "admin";
  const [statusMsg, setStatusMsg] = useState("");
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [activeSection, setActiveSection] = useState<"all" | "A" | "B" | "C" | "D" | "E" | "F">(
    "all",
  );
  const show = (sec: "A" | "B" | "C" | "D" | "E" | "F") =>
    activeSection === "all" || activeSection === sec;

  const notify = (text: string) => setStatusMsg(text);

  async function savePersonalInfo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const ageVal = (v["age"] ?? "").trim();
    const updated: StudentAcademicProfile = {
      ...profile,
      fullName: (v["fullName"] ?? "").trim().slice(0, 120) || profile.fullName,
      age: ageVal ? Number(ageVal) : null,
      classGrade: (v["classGrade"] ?? "").trim().slice(0, 40) || profile.classGrade,
      schoolName: (v["schoolName"] ?? "").trim().slice(0, 200),
      preferredLanguage: (v["preferredLanguage"] ?? "").trim().slice(0, 80) || "Hindi and English",
      joinedDate: (v["joinedDate"] ?? "").trim() || profile.joinedDate,
      educationalGoals: (v["educationalGoals"] ?? "").trim().slice(0, 1500),
      subjectsEnrolled: (v["subjectsEnrolled"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    await onSaveProfile(updated);
    setEditingInfo(false);
    notify("Student personal & educational information updated.");
  }

  async function addSubjectMarks(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const subject = (v["subject"] ?? "").trim();
    const total = Number(v["totalMarks"] ?? 100);
    const obtained = Number(v["marksObtained"] ?? 0);
    const prev = Number(v["previousMarks"] ?? 0);
    const current = Number(v["currentMarks"] ?? obtained);
    if (!subject || !Number.isFinite(total) || total <= 0) return;

    const item: SubjectPerformanceItem = {
      id: makeLocalId("sub"),
      subject,
      totalMarks: total,
      marksObtained: obtained,
      percentage: calculateSubjectPercentage(obtained, total),
      previousMarks: prev,
      currentMarks: current,
      teacherRemarks: (v["teacherRemarks"] ?? "").trim(),
    };

    const existingIdx = profile.subjectPerformances.findIndex(
      (s) => s.subject.toLowerCase() === subject.toLowerCase(),
    );
    const nextSubjects =
      existingIdx >= 0
        ? profile.subjectPerformances.map((s, idx) => (idx === existingIdx ? item : s))
        : [...profile.subjectPerformances, item];

    const enrolled = Array.from(new Set([...profile.subjectsEnrolled, subject]));
    await onSaveProfile({
      ...profile,
      subjectsEnrolled: enrolled,
      subjectPerformances: nextSubjects,
    });
    form.reset();
    notify(`Saved marks for ${subject}.`);
  }

  async function removeSubject(id: string) {
    await onSaveProfile({
      ...profile,
      subjectPerformances: profile.subjectPerformances.filter((s) => s.id !== id),
    });
    notify("Subject performance row removed.");
  }

  async function addMonthlyAssessment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const nextItem: MonthlyAssessmentItem = {
      id: makeLocalId("mon"),
      month: (v["month"] ?? "").trim() || "Dec 2026",
      overallPercentage: Math.min(100, Math.max(0, Number(v["overallPercentage"] ?? 0))),
      readingScore: Math.min(100, Math.max(0, Number(v["readingScore"] ?? 0))),
      writingScore: Math.min(100, Math.max(0, Number(v["writingScore"] ?? 0))),
      communicationScore: Math.min(100, Math.max(0, Number(v["communicationScore"] ?? 0))),
      problemSolvingScore: Math.min(100, Math.max(0, Number(v["problemSolvingScore"] ?? 0))),
      notes: (v["notes"] ?? "").trim(),
    };
    await onSaveProfile({
      ...profile,
      monthlyAssessments: [...profile.monthlyAssessments, nextItem],
    });
    form.reset();
    notify(`Recorded monthly assessment for ${nextItem.month}.`);
  }

  async function markAttendance(dateStr: string, status: AttendanceDayStatus) {
    const nextCal = { ...profile.attendanceCalendar, [dateStr]: status };
    await onSaveProfile({ ...profile, attendanceCalendar: nextCal });
    notify(`Marked ${dateStr} as ${status}.`);
  }

  async function updateSkillRating(
    category: LearningDevCategory,
    rating: number,
    observations: string,
  ) {
    const clamped = Math.min(100, Math.max(0, rating));
    const nextDev = profile.learningDevelopment.map((item) =>
      item.category === category
        ? {
            ...item,
            rating: clamped,
            level: ratingToSkillLevel(clamped),
            observations,
          }
        : item,
    );
    await onSaveProfile({ ...profile, learningDevelopment: nextDev });
    notify(`Updated ${category} progress.`);
  }

  async function saveFeedback(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    await onSaveProfile({
      ...profile,
      teacherFeedback: {
        academicStrengths: (v["academicStrengths"] ?? "").trim(),
        areasOfImprovement: (v["areasOfImprovement"] ?? "").trim(),
        areasRequiringAttention: (v["areasRequiringAttention"] ?? "").trim(),
        monthlyFeedback: (v["monthlyFeedback"] ?? "").trim(),
        recommendedActivities: (v["recommendedActivities"] ?? "").trim(),
        nextMonthGoals: (v["nextMonthGoals"] ?? "").trim(),
        teacherName: (v["teacherName"] ?? "").trim() || profile.teacherFeedback.teacherName,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
    });
    setEditingFeedback(false);
    notify("Teacher remarks & monthly feedback saved.");
  }

  async function addGoal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const title = (v["title"] ?? "").trim();
    if (!title) return;
    const goal: LearningGoalItem = {
      id: makeLocalId("goal"),
      title,
      category: (v["category"] ?? "English Communication").trim(),
      status: "Not Started",
      targetDate: (v["targetDate"] ?? "").trim() || "2026-12-30",
    };
    await onSaveProfile({
      ...profile,
      learningGoals: [...profile.learningGoals, goal],
    });
    form.reset();
    notify("Personalised learning goal added.");
  }

  async function changeGoalStatus(id: string, status: GoalStatus) {
    await onSaveProfile({
      ...profile,
      learningGoals: profile.learningGoals.map((g) => (g.id === id ? { ...g, status } : g)),
    });
    notify(`Goal marked as ${status}.`);
  }

  async function deleteGoal(id: string) {
    await onSaveProfile({
      ...profile,
      learningGoals: profile.learningGoals.filter((g) => g.id !== id),
    });
    notify("Learning goal removed.");
  }

  async function uploadDocument(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const v = Object.fromEntries(formData) as Record<string, string>;
    const file = formData.get("docFile");
    let fileUrl = (v["fileUrl"] ?? "").trim();

    setUploadingDoc(true);
    try {
      if (file instanceof File && file.size > 0) {
        const res = await uploadPlatformFile("community-media", file, "academic-docs");
        fileUrl = res.url;
      }
      if (!fileUrl) {
        notify("Please upload a certificate/document file or paste a valid URL.");
        return;
      }
      const doc: AcademicDocumentItem = {
        id: makeLocalId("doc"),
        title: (v["title"] ?? "").trim() || "Academic Document",
        docType: (v["docType"] ?? "Certificate") as AcademicDocumentItem["docType"],
        issueDate: (v["issueDate"] ?? "").trim() || new Date().toISOString().slice(0, 10),
        fileUrl,
        notes: (v["notes"] ?? "").trim(),
      };
      await onSaveProfile({
        ...profile,
        academicDocuments: [doc, ...profile.academicDocuments],
      });
      form.reset();
      notify("Certificate / academic document added.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingDoc(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft size={15} /> Back to Student Directory
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => downloadStudentProgressReportPdf(profile, isAdmin)}
          >
            <Printer size={15} /> Download PDF Progress Report
          </Button>
        </div>
      </div>

      {statusMsg && (
        <div role="status" className="form-status">
          {statusMsg}
        </div>
      )}

      {/* Profile Banner */}
      <div className="form-panel student-hero-card">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.fullName} className="student-avatar-lg" />
            ) : (
              <div className="student-avatar-lg student-avatar-fallback" aria-hidden="true">
                {profile.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="ledger-badges">
                <span className="pill-badge pill-green">{profile.studentCode}</span>
                <span className="pill-badge">{profile.classGrade}</span>
                <span className="pill-badge pill-gold">{profile.progressTier}</span>
              </div>
              <h2 className="mt-2">{profile.fullName}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {profile.schoolName || "Rabata Community Learning"} · Joined {profile.joinedDate}
              </p>
              {profile.assignedMentorNames.length > 0 && (
                <p className="text-xs text-leaf mt-1">
                  <strong>Mentors:</strong> {profile.assignedMentorNames.join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="stat-card" style={{ padding: "14px 18px" }}>
              <div className="stat-label">Academic Avg</div>
              <div className="stat-value" style={{ fontSize: 26 }}>
                {profile.overallPercentage}%
              </div>
            </div>
            <div className="stat-card" style={{ padding: "14px 18px" }}>
              <div className="stat-label">Attendance</div>
              <div className="stat-value" style={{ fontSize: 26 }}>
                {profile.attendancePercentage}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Student profile sections">
        {(
          [
            ["all", "All Sections"],
            ["A", "A · Personal Info"],
            ["B", "B · Subject Marks"],
            ["C", "C · Progress Charts"],
            ["D", "D · Attendance Calendar"],
            ["E", "E · Holistic Skills"],
            ["F", "F · Remarks, Goals & Docs"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            className="tab-btn"
            onClick={() => setActiveSection(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Section A: Personal & Educational Information */}
      {show("A") && (
        <section className="form-panel">
          <div className="section-head mb-4">
            <div>
              <div className="eyebrow">
                <User size={13} /> Section A
              </div>
              <h2>Personal &amp; educational information</h2>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setEditingInfo(!editingInfo)}>
                {editingInfo ? "Cancel editing" : "Update student information"}
              </Button>
            )}
          </div>

          {editingInfo && isAdmin ? (
            <form className="form-grid" onSubmit={savePersonalInfo}>
              <label className="field">
                Full Name *
                <input name="fullName" required defaultValue={profile.fullName} />
              </label>
              <label className="field">
                Age
                <input name="age" type="number" min={3} max={30} defaultValue={profile.age ?? ""} />
              </label>
              <label className="field">
                Class / Grade *
                <input name="classGrade" required defaultValue={profile.classGrade} />
              </label>
              <label className="field">
                School Name
                <input name="schoolName" defaultValue={profile.schoolName} />
              </label>
              <label className="field">
                Preferred Language
                <input name="preferredLanguage" defaultValue={profile.preferredLanguage} />
              </label>
              <label className="field">
                Date of Joining Rabata
                <input name="joinedDate" type="date" defaultValue={profile.joinedDate} />
              </label>
              <label className="field wide">
                Subjects Enrolled (comma separated)
                <input name="subjectsEnrolled" defaultValue={profile.subjectsEnrolled.join(", ")} />
              </label>
              <label className="field wide">
                Educational Goals
                <textarea name="educationalGoals" defaultValue={profile.educationalGoals} />
              </label>
              <div className="field wide">
                <Button type="submit">Save information</Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <small className="block text-xs text-muted-foreground">Full Name</small>
                <strong>{profile.fullName}</strong>
              </div>
              <div>
                <small className="block text-xs text-muted-foreground">Student ID</small>
                <strong>{profile.studentCode}</strong>
              </div>
              <div>
                <small className="block text-xs text-muted-foreground">
                  Age &amp; Class / Grade
                </small>
                <strong>
                  {profile.age ? `${profile.age} yrs · ` : ""}
                  {profile.classGrade}
                </strong>
              </div>
              <div>
                <small className="block text-xs text-muted-foreground">School Name</small>
                <strong>{profile.schoolName || "—"}</strong>
              </div>
              <div>
                <small className="block text-xs text-muted-foreground">Preferred Language</small>
                <strong>{profile.preferredLanguage}</strong>
              </div>
              <div>
                <small className="block text-xs text-muted-foreground">
                  Date of Joining Rabata
                </small>
                <strong>{profile.joinedDate}</strong>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <small className="block text-xs text-muted-foreground">Subjects Enrolled</small>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile.subjectsEnrolled.map((sub) => (
                    <span key={sub} className="pill-badge">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <small className="block text-xs text-muted-foreground">Educational Goals</small>
                <p className="text-xs mt-1">{profile.educationalGoals}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 border-t pt-3">
                <small className="block text-xs text-muted-foreground">
                  Parent / Guardian Contact
                </small>
                {isAdmin ? (
                  <p className="text-xs mt-1">
                    <strong>{profile.guardianName || "Parent / Guardian"}</strong> ·{" "}
                    {profile.guardianEmail || "No email"}
                    {profile.guardianPhone ? ` · ${profile.guardianPhone}` : ""}
                  </p>
                ) : (
                  <span className="pill-badge mt-1">
                    <Lock size={11} /> Restricted to Authorised Administrators
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Section B: Subject-wise Academic Performance */}
      {show("B") && (
        <section className="form-panel">
          <div className="section-head mb-4">
            <div>
              <div className="eyebrow">
                <BookOpen size={13} /> Section B
              </div>
              <h2>Subject-wise academic performance</h2>
            </div>
            <div className="ledger-badges">
              {profile.strongestSubject && (
                <span className="pill-badge pill-green">Strongest: {profile.strongestSubject}</span>
              )}
              {profile.needsAttentionSubject && (
                <span className="pill-badge pill-gold">Focus: {profile.needsAttentionSubject}</span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="academic-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Total Marks</th>
                  <th>Marks Obtained</th>
                  <th>Percentage</th>
                  <th>Previous Assessment</th>
                  <th>Current Assessment</th>
                  <th>Teacher's Remarks</th>
                  {canEditAcademic && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {profile.subjectPerformances.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEditAcademic ? 8 : 7}
                      className="text-center text-muted-foreground"
                    >
                      No subject marks recorded yet.
                    </td>
                  </tr>
                ) : (
                  profile.subjectPerformances.map((s) => {
                    const pct = calculateSubjectPercentage(s.marksObtained, s.totalMarks);
                    const delta = s.currentMarks - s.previousMarks;
                    return (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.subject}</strong>
                        </td>
                        <td>{s.totalMarks}</td>
                        <td>{s.marksObtained}</td>
                        <td>
                          <span
                            className={`pill-badge ${pct >= 75 ? "pill-green" : pct < 55 ? "pill-gold" : ""}`}
                          >
                            {pct}%
                          </span>
                        </td>
                        <td>{s.previousMarks}</td>
                        <td>
                          {s.currentMarks}{" "}
                          <small className={delta >= 0 ? "text-leaf" : "text-destructive"}>
                            ({delta >= 0 ? `+${delta}` : delta})
                          </small>
                        </td>
                        <td className="text-xs text-muted-foreground">{s.teacherRemarks}</td>
                        {canEditAcademic && (
                          <td>
                            <Button size="sm" variant="ghost" onClick={() => removeSubject(s.id)}>
                              <Trash2 size={13} />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {canEditAcademic && (
            <form className="mt-6 border-t pt-5 form-grid" onSubmit={addSubjectMarks}>
              <h3 className="field wide text-base font-medium">Add or update subject marks</h3>
              <label className="field">
                Subject *
                <input name="subject" required placeholder="e.g. English, Mathematics, Science" />
              </label>
              <label className="field">
                Total Marks *
                <input name="totalMarks" type="number" min={1} defaultValue={100} required />
              </label>
              <label className="field">
                Marks Obtained *
                <input name="marksObtained" type="number" min={0} required />
              </label>
              <label className="field">
                Previous Assessment Marks
                <input name="previousMarks" type="number" min={0} defaultValue={0} />
              </label>
              <label className="field">
                Current Assessment Marks
                <input name="currentMarks" type="number" min={0} />
              </label>
              <label className="field">
                Teacher's Remarks
                <input name="teacherRemarks" placeholder="Strength or focus observation" />
              </label>
              <div className="field wide">
                <Button type="submit" size="sm">
                  Save subject marks
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Section C: Academic Progress Tracking */}
      {show("C") && (
        <section className="form-panel space-y-6">
          <div>
            <div className="eyebrow">
              <GraduationCap size={13} /> Section C
            </div>
            <h2>Academic progress tracking</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <MonthlyPerformanceSvgChart assessments={profile.monthlyAssessments} />
            <SubjectStrengthsChart subjects={profile.subjectPerformances} />
          </div>

          <CoreCompetencyChart assessments={profile.monthlyAssessments} />

          {canEditAcademic && (
            <form className="border-t pt-5 form-grid" onSubmit={addMonthlyAssessment}>
              <h3 className="field wide text-base font-medium">Record new monthly assessment</h3>
              <label className="field">
                Month / Period *
                <input name="month" required placeholder="e.g. Dec 2026" />
              </label>
              <label className="field">
                Overall Percentage (0–100) *
                <input name="overallPercentage" type="number" min={0} max={100} required />
              </label>
              <label className="field">
                Reading Score (0–100) *
                <input name="readingScore" type="number" min={0} max={100} required />
              </label>
              <label className="field">
                Writing Score (0–100) *
                <input name="writingScore" type="number" min={0} max={100} required />
              </label>
              <label className="field">
                Communication Score (0–100) *
                <input name="communicationScore" type="number" min={0} max={100} required />
              </label>
              <label className="field">
                Problem-Solving Score (0–100) *
                <input name="problemSolvingScore" type="number" min={0} max={100} required />
              </label>
              <label className="field wide">
                Assessment Notes
                <input name="notes" placeholder="Summary of improvement over this month" />
              </label>
              <div className="field wide">
                <Button type="submit" size="sm">
                  Add monthly assessment record
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Section D: Attendance Tracker */}
      {show("D") && (
        <section className="form-panel space-y-6">
          <div>
            <div className="eyebrow">
              <CalendarCheck size={13} /> Section D
            </div>
            <h2>Attendance tracker</h2>
          </div>

          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-label">Classes Conducted</div>
              <div className="stat-value">{profile.totalConducted}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Classes Attended</div>
              <div className="stat-value">{profile.attendedClasses}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Classes Missed</div>
              <div className="stat-value">{profile.missedClasses}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Attendance %</div>
              <div className="stat-value">{profile.attendancePercentage}%</div>
            </div>
          </div>

          <MonthlyAttendanceCalendar
            calendar={profile.attendanceCalendar}
            canEdit={canEditAcademic}
            onMarkDate={markAttendance}
          />
        </section>
      )}

      {/* Section E: Learning Development (Beyond Examination Marks) */}
      {show("E") && (
        <section className="form-panel space-y-5">
          <div>
            <div className="eyebrow">
              <Award size={13} /> Section E
            </div>
            <h2>Learning development (Beyond exam marks)</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Tracking holistic growth across reading, writing, spoken English, computers, general
              knowledge, confidence and practical skills.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {profile.learningDevelopment.map((item) => (
              <article key={item.category} className="chart-box space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <strong className="text-sm">{item.category}</strong>
                  <span className="pill-badge pill-green">
                    {item.rating}% · {item.level}
                  </span>
                </div>
                <div className="fund-bar">
                  <div className="fund-bar-fill" style={{ width: `${item.rating}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{item.observations}</p>
                {canEditAcademic && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                    <label className="text-[11px] flex items-center gap-2">
                      Rating:
                      <input
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={item.rating}
                        className="w-16 border rounded px-2 py-1 text-xs"
                        onBlur={(e) =>
                          updateSkillRating(
                            item.category,
                            Number(e.target.value),
                            item.observations,
                          )
                        }
                      />
                    </label>
                    <input
                      aria-label={`${item.category} observation`}
                      defaultValue={item.observations}
                      className="flex-1 border rounded px-2 py-1 text-xs min-w-[160px]"
                      onBlur={(e) => updateSkillRating(item.category, item.rating, e.target.value)}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Section F: Teacher's Remarks, Learning Goals & Certificates */}
      {show("F") && (
        <>
          <section className="form-panel space-y-6">
            <div className="section-head mb-2">
              <div>
                <div className="eyebrow">
                  <MessageSquare size={13} /> Section F
                </div>
                <h2>Teacher's remarks &amp; feedback</h2>
              </div>
              {canEditAcademic && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingFeedback(!editingFeedback)}
                >
                  {editingFeedback ? "Cancel edit" : "Update teacher feedback"}
                </Button>
              )}
            </div>

            {editingFeedback && canEditAcademic ? (
              <form className="form-grid" onSubmit={saveFeedback}>
                <label className="field wide">
                  Academic Strengths
                  <textarea
                    name="academicStrengths"
                    defaultValue={profile.teacherFeedback.academicStrengths}
                  />
                </label>
                <label className="field wide">
                  Areas of Improvement
                  <textarea
                    name="areasOfImprovement"
                    defaultValue={profile.teacherFeedback.areasOfImprovement}
                  />
                </label>
                <label className="field wide">
                  Areas Requiring Attention
                  <textarea
                    name="areasRequiringAttention"
                    defaultValue={profile.teacherFeedback.areasRequiringAttention}
                  />
                </label>
                <label className="field wide">
                  Monthly Feedback
                  <textarea
                    name="monthlyFeedback"
                    defaultValue={profile.teacherFeedback.monthlyFeedback}
                  />
                </label>
                <label className="field wide">
                  Recommended Learning Activities
                  <textarea
                    name="recommendedActivities"
                    defaultValue={profile.teacherFeedback.recommendedActivities}
                  />
                </label>
                <label className="field wide">
                  Next Month's Learning Goals
                  <textarea
                    name="nextMonthGoals"
                    defaultValue={profile.teacherFeedback.nextMonthGoals}
                  />
                </label>
                <label className="field">
                  Teacher Name
                  <input name="teacherName" defaultValue={profile.teacherFeedback.teacherName} />
                </label>
                <div className="field wide">
                  <Button type="submit">Save teacher feedback</Button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 text-xs">
                <div className="chart-box">
                  <strong>Academic Strengths</strong>
                  <p className="text-muted-foreground mt-1">
                    {profile.teacherFeedback.academicStrengths}
                  </p>
                </div>
                <div className="chart-box">
                  <strong>Areas of Improvement</strong>
                  <p className="text-muted-foreground mt-1">
                    {profile.teacherFeedback.areasOfImprovement}
                  </p>
                </div>
                <div className="chart-box">
                  <strong>Areas Requiring Attention</strong>
                  <p className="text-muted-foreground mt-1">
                    {profile.teacherFeedback.areasRequiringAttention}
                  </p>
                </div>
                <div className="chart-box">
                  <strong>Monthly Feedback</strong>
                  <p className="text-muted-foreground mt-1">
                    {profile.teacherFeedback.monthlyFeedback}
                  </p>
                </div>
                <div className="chart-box">
                  <strong>Recommended Learning Activities</strong>
                  <p className="text-muted-foreground mt-1">
                    {profile.teacherFeedback.recommendedActivities}
                  </p>
                </div>
                <div className="chart-box">
                  <strong>Next Month's Learning Goals</strong>
                  <p className="text-muted-foreground mt-1">
                    {profile.teacherFeedback.nextMonthGoals}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Individual Learning Goals */}
          <section className="form-panel space-y-5">
            <div>
              <div className="eyebrow">
                <Target size={13} /> Individual Learning Goals
              </div>
              <h2>Personalised learning goals</h2>
            </div>

            <div className="grid gap-3">
              {profile.learningGoals.length === 0 ? (
                <div className="empty-state">No learning goals assigned yet.</div>
              ) : (
                profile.learningGoals.map((goal) => (
                  <div key={goal.id} className="ledger-row" style={{ padding: 16 }}>
                    <div>
                      <div className="ledger-badges">
                        <span
                          className={`pill-badge ${
                            goal.status === "Completed"
                              ? "pill-green"
                              : goal.status === "In Progress"
                                ? "pill-gold"
                                : ""
                          }`}
                        >
                          {goal.status}
                        </span>
                        <span className="pill-badge">{goal.category}</span>
                        <span className="text-xs text-muted-foreground">
                          Target: {goal.targetDate}
                        </span>
                      </div>
                      <strong className="block mt-2 text-sm">{goal.title}</strong>
                    </div>
                    {canEditAcademic && (
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Status for ${goal.title}`}
                          className="border rounded px-2 py-1 text-xs bg-background"
                          value={goal.status}
                          onChange={(e) => changeGoalStatus(goal.id, e.target.value as GoalStatus)}
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <Button size="sm" variant="ghost" onClick={() => deleteGoal(goal.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {canEditAcademic && (
              <form className="border-t pt-4 form-grid" onSubmit={addGoal}>
                <label className="field wide">
                  New Learning Goal *
                  <input
                    name="title"
                    required
                    placeholder="e.g. Improve English sentence formation & reading fluency"
                  />
                </label>
                <label className="field">
                  Skill / Subject Area
                  <input name="category" defaultValue="English Communication" />
                </label>
                <label className="field">
                  Target Date
                  <input name="targetDate" type="date" defaultValue="2026-12-20" />
                </label>
                <div className="field wide">
                  <Button type="submit" size="sm">
                    Add learning goal
                  </Button>
                </div>
              </form>
            )}
          </section>

          {/* Certificates & Academic Documents */}
          <section className="form-panel space-y-5">
            <div>
              <div className="eyebrow">
                <FileText size={13} /> Certificates &amp; Academic Records
              </div>
              <h2>Certificates, report cards &amp; achievements</h2>
            </div>

            {profile.academicDocuments.length === 0 ? (
              <div className="empty-state">No certificates or academic documents uploaded yet.</div>
            ) : (
              <div className="grid gap-3">
                {profile.academicDocuments.map((doc) => (
                  <div key={doc.id} className="ledger-row" style={{ padding: 16 }}>
                    <div>
                      <div className="ledger-badges">
                        <span className="pill-badge pill-green">{doc.docType}</span>
                        <span className="text-xs text-muted-foreground">{doc.issueDate}</span>
                      </div>
                      <strong className="block mt-2 text-sm">{doc.title}</strong>
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>
                      )}
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={13} /> View document
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <form className="border-t pt-4 form-grid" onSubmit={uploadDocument}>
                <h3 className="field wide text-base font-medium">
                  Upload certificate or academic document
                </h3>
                <label className="field">
                  Document Title *
                  <input
                    name="title"
                    required
                    placeholder="e.g. Half-Yearly Progress Certificate"
                  />
                </label>
                <label className="field">
                  Type
                  <select name="docType" defaultValue="Certificate">
                    <option value="Certificate">Certificate</option>
                    <option value="Report Card">Report Card</option>
                    <option value="Achievement">Achievement</option>
                    <option value="Worksheet">Worksheet</option>
                  </select>
                </label>
                <label className="field">
                  Upload File (Image / PDF)
                  <input name="docFile" type="file" accept="image/*,.pdf" />
                </label>
                <label className="field">
                  Or Document URL
                  <input name="fileUrl" placeholder="https://..." />
                </label>
                <label className="field">
                  Issue Date
                  <input
                    name="issueDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </label>
                <label className="field">
                  Notes
                  <input name="notes" placeholder="Optional remarks" />
                </label>
                <div className="field wide">
                  <Button type="submit" size="sm" disabled={uploadingDoc}>
                    {uploadingDoc ? "Uploading…" : "Attach document"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}
