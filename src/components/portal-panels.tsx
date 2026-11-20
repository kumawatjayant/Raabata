import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { BookOpen, ClipboardCheck, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { makeLocalId, readLocalDb, shouldUseLocalMode, updateLocalDb } from "@/lib/local-store";
import {
  CLASS_LEVELS,
  type AssignmentRow,
  type MentorProfileRow,
  type ProgressLogRow,
  type StudentRecordRow,
} from "@/lib/platform";

export function MentorWorkspace({ userId, userEmail }: { userId: string; userEmail: string }) {
  const qc = useQueryClient();
  const [statusMsg, setStatusMsg] = useState("");
  const [isErr, setIsErr] = useState(false);
  const [logStudentId, setLogStudentId] = useState<string | null>(null);

  const mentorQuery = useQuery({
    queryKey: ["mentor-workspace", userId],
    queryFn: async () => {
      if (shouldUseLocalMode()) {
        const db = readLocalDb();
        const profile = db.mentor_profiles.find((p) => p.user_id === userId) ?? null;
        const assignments = db.mentor_student_assignments.filter(
          (a) => a.mentor_user_id === userId && a.active,
        );
        const assignedIds = new Set(assignments.map((a) => a.student_id));
        const students = db.student_records.filter(
          (s) => assignedIds.has(s.id) || s.created_by === userId,
        );
        const visibleStudentIds = new Set(students.map((s) => s.id));
        const logs = db.student_progress_logs.filter((l) => visibleStudentIds.has(l.student_id));
        return { profile, assignments, students, logs };
      }

      const [profileRes, assignmentsRes, studentsRes, logsRes] = await Promise.all([
        supabase.from("mentor_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("mentor_student_assignments")
          .select("*")
          .eq("mentor_user_id", userId)
          .eq("active", true),
        supabase.from("student_records").select("*").order("created_at", { ascending: false }),
        supabase
          .from("student_progress_logs")
          .select("*")
          .order("session_date", { ascending: false })
          .limit(60),
      ]);

      if (shouldUseLocalMode(profileRes.error ?? studentsRes.error)) {
        const db = readLocalDb();
        const profile = db.mentor_profiles.find((p) => p.user_id === userId) ?? null;
        const assignments = db.mentor_student_assignments.filter(
          (a) => a.mentor_user_id === userId && a.active,
        );
        const assignedIds = new Set(assignments.map((a) => a.student_id));
        const students = db.student_records.filter(
          (s) => assignedIds.has(s.id) || s.created_by === userId,
        );
        const visibleIds = new Set(students.map((s) => s.id));
        return {
          profile,
          assignments,
          students,
          logs: db.student_progress_logs.filter((l) => visibleIds.has(l.student_id)),
        };
      }

      return {
        profile: (profileRes.data ?? null) as MentorProfileRow | null,
        assignments: (assignmentsRes.data ?? []) as AssignmentRow[],
        students: (studentsRes.data ?? []) as StudentRecordRow[],
        logs: (logsRes.data ?? []) as ProgressLogRow[],
      };
    },
  });

  const notify = (msg: string, error = false) => {
    setStatusMsg(msg);
    setIsErr(error);
  };

  async function saveMentorProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const now = new Date().toISOString();
    const payload: MentorProfileRow = {
      user_id: userId,
      full_name: (v["full_name"] ?? "").trim().slice(0, 120),
      email: ((v["email"] ?? "").trim() || userEmail).slice(0, 255),
      phone: (v["phone"] ?? "").trim().slice(0, 40) || null,
      location: (v["location"] ?? "").trim().slice(0, 160) || null,
      qualifications: (v["qualifications"] ?? "").trim().slice(0, 300),
      subjects: (v["subjects"] ?? "").trim().slice(0, 300),
      class_levels: (v["class_levels"] ?? "").trim().slice(0, 160),
      languages: (v["languages"] ?? "").trim().slice(0, 160) || "Hindi, English",
      availability: (v["availability"] ?? "").trim().slice(0, 200) || null,
      experience: (v["experience"] ?? "").trim().slice(0, 300) || null,
      bio: (v["bio"] ?? "").trim().slice(0, 1000) || null,
      is_active: true,
      created_at: mentorQuery.data?.profile?.created_at ?? now,
      updated_at: now,
    };

    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        mentor_profiles: [...db.mentor_profiles.filter((p) => p.user_id !== userId), payload],
      }));
      notify("Your mentor profile was saved securely.");
      qc.invalidateQueries({ queryKey: ["mentor-workspace", userId] });
      return;
    }

    const { error } = await supabase.from("mentor_profiles").upsert(payload);
    if (shouldUseLocalMode(error)) {
      updateLocalDb((db) => ({
        ...db,
        mentor_profiles: [...db.mentor_profiles.filter((p) => p.user_id !== userId), payload],
      }));
      notify("Your mentor profile was saved locally for preview.");
      qc.invalidateQueries({ queryKey: ["mentor-workspace", userId] });
      return;
    }
    if (error) {
      notify(`Could not save mentor profile: ${error.message}`, true);
      return;
    }
    notify("Your mentor profile was saved securely.");
    qc.invalidateQueries({ queryKey: ["mentor-workspace", userId] });
  }

  async function addAssignedStudent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (v["guardian_consent"] !== "on") {
      notify("Please confirm guardian consent before adding a student record.", true);
      return;
    }
    const firstName = (v["first_name"] ?? "").trim().slice(0, 100);
    const guardianEmail = (v["guardian_email"] ?? "").trim().slice(0, 255);
    const subjectsNeeded = (v["subjects_needed"] ?? "").trim().slice(0, 300);
    const classLevel = (v["class_level"] ?? "").trim().slice(0, 40);
    if (!firstName || !guardianEmail || !subjectsNeeded || !classLevel) {
      notify("Student first name, guardian email, class and subjects are required.", true);
      return;
    }

    const saveToLocal = () => {
      const now = new Date().toISOString();
      const studentId = makeLocalId("stu");
      const newStudent: StudentRecordRow = {
        id: studentId,
        student_user_id: null,
        first_name: firstName,
        guardian_name: (v["guardian_name"] ?? "").trim().slice(0, 120) || null,
        guardian_email: guardianEmail,
        guardian_phone: (v["guardian_phone"] ?? "").trim().slice(0, 40) || null,
        class_level: classLevel,
        subjects_needed: subjectsNeeded,
        preferred_language:
          (v["preferred_language"] ?? "").trim().slice(0, 80) || "Hindi and English",
        preferred_format: (v["preferred_format"] ?? "").trim().slice(0, 80) || "In person",
        learning_goals: (v["learning_goals"] ?? "").trim().slice(0, 1000) || null,
        attendance_count: 0,
        total_sessions: 0,
        progress_summary: null,
        status: "active",
        guardian_consent: true,
        created_by: userId,
        created_at: now,
        updated_at: now,
      };
      const newAssignment: AssignmentRow = {
        id: makeLocalId("asgn"),
        mentor_user_id: userId,
        student_id: studentId,
        subjects: subjectsNeeded.slice(0, 200),
        schedule_notes: (v["schedule_notes"] ?? "").trim().slice(0, 300) || null,
        active: true,
        assigned_by: userId,
        assigned_at: now,
      };
      updateLocalDb((db) => ({
        ...db,
        student_records: [newStudent, ...db.student_records],
        mentor_student_assignments: [newAssignment, ...db.mentor_student_assignments],
      }));
    };

    if (shouldUseLocalMode()) {
      saveToLocal();
      form.reset();
      notify("Student record added and linked to your mentor account.");
      qc.invalidateQueries({ queryKey: ["mentor-workspace", userId] });
      return;
    }

    const { data: student, error: insertError } = await supabase
      .from("student_records")
      .insert({
        first_name: firstName,
        guardian_name: (v["guardian_name"] ?? "").trim().slice(0, 120) || null,
        guardian_email: guardianEmail,
        guardian_phone: (v["guardian_phone"] ?? "").trim().slice(0, 40) || null,
        class_level: classLevel,
        subjects_needed: subjectsNeeded,
        preferred_language:
          (v["preferred_language"] ?? "").trim().slice(0, 80) || "Hindi and English",
        preferred_format: (v["preferred_format"] ?? "").trim().slice(0, 80) || "In person",
        learning_goals: (v["learning_goals"] ?? "").trim().slice(0, 1000) || null,
        guardian_consent: true,
        created_by: userId,
      })
      .select("id")
      .single();

    if (shouldUseLocalMode(insertError)) {
      saveToLocal();
      form.reset();
      notify("Student record added to local preview database.");
      qc.invalidateQueries({ queryKey: ["mentor-workspace", userId] });
      return;
    }

    if (insertError || !student) {
      notify(`Could not save student record: ${insertError?.message ?? "Unknown error"}`, true);
      return;
    }

    const { error: assignErr } = await supabase.from("mentor_student_assignments").insert({
      mentor_user_id: userId,
      student_id: student.id,
      subjects: subjectsNeeded.slice(0, 200),
      schedule_notes: (v["schedule_notes"] ?? "").trim().slice(0, 300) || null,
      assigned_by: userId,
      active: true,
    });

    if (assignErr) {
      notify(`Student saved, but assignment failed: ${assignErr.message}`, true);
      return;
    }

    form.reset();
    notify("Student record added and linked to your mentor account.");
    qc.invalidateQueries({ queryKey: ["mentor-workspace", userId] });
  }

  async function logSessionProgress(e: FormEvent<HTMLFormElement>, student: StudentRecordRow) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const topic = (v["topic_covered"] ?? "").trim().slice(0, 300);
    if (!topic) {
      notify("Please enter the topic covered in this session.", true);
      return;
    }
    const attendanceStatus = (v["attendance_status"] ?? "present") as
      "present" | "absent" | "excused";
    const remarks = (v["remarks"] ?? "").trim().slice(0, 1000) || null;
    const sessionDate = (v["session_date"] ?? "").trim() || new Date().toISOString().slice(0, 10);
    const nextTotal = student.total_sessions + 1;
    const nextPresent = student.attendance_count + (attendanceStatus === "present" ? 1 : 0);

    const saveLogLocally = () => {
      const now = new Date().toISOString();
      const newLog: ProgressLogRow = {
        id: makeLocalId("log"),
        student_id: student.id,
        mentor_user_id: userId,
        session_date: sessionDate,
        topic_covered: topic,
        attendance_status: attendanceStatus,
        remarks,
        created_at: now,
      };
      updateLocalDb((db) => ({
        ...db,
        student_progress_logs: [newLog, ...db.student_progress_logs],
        student_records: db.student_records.map((s) =>
          s.id === student.id
            ? {
                ...s,
                total_sessions: nextTotal,
                attendance_count: nextPresent,
                progress_summary: remarks ?? s.progress_summary,
                updated_at: now,
              }
            : s,
        ),
      }));
    };

    if (shouldUseLocalMode()) {
      saveLogLocally();
      form.reset();
      setLogStudentId(null);
      notify(`Recorded session update for ${student.first_name}.`);
      qc.invalidateQueries({ queryKey: ["mentor-workspace", userId] });
      return;
    }

    const { error: logErr } = await supabase.from("student_progress_logs").insert({
      student_id: student.id,
      mentor_user_id: userId,
      session_date: sessionDate,
      topic_covered: topic,
      attendance_status: attendanceStatus,
      remarks,
    });

    if (shouldUseLocalMode(logErr)) {
      saveLogLocally();
      form.reset();
      setLogStudentId(null);
      notify(`Recorded session update for ${student.first_name}.`);
      qc.invalidateQueries({ queryKey: ["mentor-workspace", userId] });
      return;
    }

    if (logErr) {
      notify(`Could not record session log: ${logErr.message}`, true);
      return;
    }

    await supabase
      .from("student_records")
      .update({
        total_sessions: nextTotal,
        attendance_count: nextPresent,
        progress_summary: remarks ?? student.progress_summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", student.id);

    form.reset();
    setLogStudentId(null);
    notify(`Recorded session update for ${student.first_name}.`);
    qc.invalidateQueries({ queryKey: ["mentor-workspace", userId] });
  }

  const data = mentorQuery.data;
  const profile = data?.profile;
  const students = data?.students ?? [];
  const assignments = data?.assignments ?? [];
  const logs = data?.logs ?? [];

  return (
    <div className="mt-12 space-y-10">
      <div className="trust-banner">
        <ShieldCheck size={18} />
        <div>
          <strong>Mentor Workspace (Isolated Access):</strong> Protected by Row-Level Security. You
          can view and manage only your own mentor profile and the students assigned to or added by
          you. Other mentors’ details and unassigned student records remain strictly hidden.
        </div>
      </div>

      {statusMsg && (
        <div
          role={isErr ? "alert" : "status"}
          className={`form-status ${isErr ? "form-error" : ""}`}
        >
          {statusMsg}
        </div>
      )}

      <form className="form-panel" onSubmit={saveMentorProfile}>
        <div className="section-head mb-4">
          <div>
            <div className="eyebrow">
              <Users size={13} /> Mentor Profile
            </div>
            <h2>Personal &amp; teaching details</h2>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            Full name *
            <input
              name="full_name"
              required
              maxLength={120}
              defaultValue={profile?.full_name ?? ""}
              placeholder="Your full name"
            />
          </label>
          <label className="field">
            Contact email *
            <input
              name="email"
              type="email"
              required
              maxLength={255}
              defaultValue={profile?.email || userEmail}
            />
          </label>
          <label className="field">
            Phone number
            <input name="phone" maxLength={40} defaultValue={profile?.phone ?? ""} />
          </label>
          <label className="field">
            Location / City
            <input
              name="location"
              maxLength={160}
              defaultValue={profile?.location ?? ""}
              placeholder="e.g. Derabassi, Punjab"
            />
          </label>
          <label className="field">
            Qualifications *
            <input
              name="qualifications"
              required
              maxLength={300}
              defaultValue={profile?.qualifications ?? ""}
              placeholder="e.g. B.Ed, Graduate in English"
            />
          </label>
          <label className="field">
            Subjects you teach *
            <input
              name="subjects"
              required
              maxLength={300}
              defaultValue={profile?.subjects ?? ""}
              placeholder="e.g. Spoken English, Science"
            />
          </label>
          <label className="field">
            Classes taught
            <input
              name="class_levels"
              maxLength={160}
              defaultValue={profile?.class_levels ?? ""}
              placeholder="e.g. Classes 4–8"
            />
          </label>
          <label className="field">
            Languages
            <input
              name="languages"
              maxLength={160}
              defaultValue={profile?.languages ?? "Hindi, English"}
            />
          </label>
          <label className="field">
            Weekly availability
            <input
              name="availability"
              maxLength={200}
              defaultValue={profile?.availability ?? ""}
              placeholder="e.g. Sat–Sun 4 PM – 6 PM"
            />
          </label>
          <label className="field">
            Teaching experience
            <input
              name="experience"
              maxLength={300}
              defaultValue={profile?.experience ?? ""}
              placeholder="Years or relevant background"
            />
          </label>
          <label className="field wide">
            Short bio &amp; mentorship focus
            <textarea
              name="bio"
              maxLength={1000}
              defaultValue={profile?.bio ?? ""}
              placeholder="Share how you support students…"
            />
          </label>
        </div>
        <Button type="submit" className="mt-6">
          Save mentor profile
        </Button>
      </form>

      <div className="form-panel">
        <div className="section-head mb-4">
          <div>
            <div className="eyebrow">
              <ClipboardCheck size={13} /> My assigned students ({students.length})
            </div>
            <h2>Students you teach</h2>
          </div>
        </div>

        {mentorQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading your assigned students…</p>
        ) : students.length === 0 ? (
          <div className="empty-state">
            No students are assigned to you yet. The administrator can assign learners to your
            account, or you can add a student you are teaching below.
          </div>
        ) : (
          <div className="grid gap-4">
            {students.map((student) => {
              const assign = assignments.find((a) => a.student_id === student.id);
              const studentLogs = logs.filter((l) => l.student_id === student.id);
              return (
                <article
                  key={student.id}
                  className="ledger-row"
                  style={{ alignItems: "stretch", flexDirection: "column" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="ledger-badges">
                        <span className="pill-badge pill-green">Class {student.class_level}</span>
                        <span className="pill-badge">{student.status}</span>
                        <span className="text-xs text-muted-foreground">
                          Attendance: {student.attendance_count}/{student.total_sessions} sessions
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-medium">{student.first_name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Subjects:</strong> {assign?.subjects || student.subjects_needed} ·{" "}
                        <strong>Format:</strong> {student.preferred_format} (
                        {student.preferred_language})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Guardian:</strong> {student.guardian_name || "Parent/Guardian"} ·{" "}
                        {student.guardian_email}
                        {student.guardian_phone ? ` · ${student.guardian_phone}` : ""}
                      </p>
                      {student.learning_goals && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <strong>Goals:</strong> {student.learning_goals}
                        </p>
                      )}
                      {student.progress_summary && (
                        <p className="text-xs text-foreground mt-2">
                          <strong>Latest progress note:</strong> {student.progress_summary}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setLogStudentId(logStudentId === student.id ? null : student.id)
                      }
                    >
                      {logStudentId === student.id ? "Cancel log" : "Log session & progress"}
                    </Button>
                  </div>

                  {logStudentId === student.id && (
                    <form
                      className="mt-4 border-t pt-4 form-grid"
                      onSubmit={(e) => logSessionProgress(e, student)}
                    >
                      <label className="field">
                        Session date
                        <input
                          name="session_date"
                          type="date"
                          defaultValue={new Date().toISOString().slice(0, 10)}
                        />
                      </label>
                      <label className="field">
                        Attendance
                        <select name="attendance_status" defaultValue="present">
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="excused">Excused</option>
                        </select>
                      </label>
                      <label className="field wide">
                        Topic covered *
                        <input
                          name="topic_covered"
                          required
                          maxLength={300}
                          placeholder="e.g. Spoken English introductions & reading"
                        />
                      </label>
                      <label className="field wide">
                        Progress remarks
                        <textarea
                          name="remarks"
                          maxLength={1000}
                          placeholder="Observations, strengths, next steps…"
                        />
                      </label>
                      <div className="field wide">
                        <Button type="submit" size="sm">
                          Save session log
                        </Button>
                      </div>
                    </form>
                  )}

                  {studentLogs.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <small className="block text-[11px] font-semibold text-muted-foreground mb-2">
                        Recent session logs
                      </small>
                      <div className="space-y-1">
                        {studentLogs.slice(0, 4).map((log) => (
                          <div key={log.id} className="text-xs text-muted-foreground">
                            <strong>{log.session_date}</strong> ·{" "}
                            <span className="capitalize">{log.attendance_status}</span> ·{" "}
                            {log.topic_covered}
                            {log.remarks ? ` — ${log.remarks}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <form className="form-panel" onSubmit={addAssignedStudent}>
        <div className="eyebrow">
          <UserPlus size={13} /> Student intake
        </div>
        <h2>Add a student you teach</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Only store necessary educational details with verified guardian consent. Do not enter
          identity documents or home addresses.
        </p>
        <div className="form-grid">
          <label className="field">
            Student’s first name *
            <input name="first_name" required maxLength={100} placeholder="First name only" />
          </label>
          <label className="field">
            Class / Grade *
            <select name="class_level" required defaultValue="">
              <option value="" disabled>
                Select class
              </option>
              {CLASS_LEVELS.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Guardian name
            <input name="guardian_name" maxLength={120} placeholder="Parent or legal guardian" />
          </label>
          <label className="field">
            Guardian email *
            <input name="guardian_email" type="email" required maxLength={255} />
          </label>
          <label className="field">
            Guardian phone
            <input name="guardian_phone" maxLength={40} />
          </label>
          <label className="field">
            Subjects *
            <input
              name="subjects_needed"
              required
              maxLength={300}
              placeholder="e.g. English, Math"
            />
          </label>
          <label className="field">
            Preferred language
            <select name="preferred_language" defaultValue="Hindi and English">
              <option>Hindi and English</option>
              <option>Hindi</option>
              <option>English</option>
              <option>Punjabi</option>
            </select>
          </label>
          <label className="field">
            Format
            <select name="preferred_format" defaultValue="In person">
              <option>In person</option>
              <option>Online</option>
              <option>Either</option>
            </select>
          </label>
          <label className="field wide">
            Schedule &amp; learning goals
            <textarea
              name="learning_goals"
              maxLength={1000}
              placeholder="What skills or subjects is the student focusing on?"
            />
          </label>
        </div>
        <label className="consent">
          <input type="checkbox" name="guardian_consent" required />
          <span>
            I confirm that parent or legal guardian consent has been obtained for recording this
            student’s learning support details in Rabata.
          </span>
        </label>
        <Button type="submit">Add student to my roster</Button>
      </form>
    </div>
  );
}

export function StudentWorkspace({ userId }: { userId: string }) {
  const studentQuery = useQuery({
    queryKey: ["student-workspace", userId],
    queryFn: async () => {
      if (shouldUseLocalMode()) {
        const db = readLocalDb();
        const records = db.student_records.filter((r) => r.student_user_id === userId);
        const recIds = new Set(records.map((r) => r.id));
        const assigns = db.mentor_student_assignments.filter(
          (a) => a.active && recIds.has(a.student_id),
        );
        const mentorIds = new Set(assigns.map((a) => a.mentor_user_id));
        const mentors = db.mentor_profiles
          .filter((m) => mentorIds.has(m.user_id))
          .map((m) => ({
            user_id: m.user_id,
            full_name: m.full_name,
            subjects: m.subjects,
            languages: m.languages,
          }));
        const logs = db.student_progress_logs.filter((l) => recIds.has(l.student_id));
        return { records, mentors, logs };
      }

      const [recordsRes, mentorsRes, logsRes] = await Promise.all([
        supabase.from("student_records").select("*").eq("student_user_id", userId),
        supabase.from("mentor_profiles").select("user_id,full_name,subjects,languages"),
        supabase
          .from("student_progress_logs")
          .select("*")
          .order("session_date", { ascending: false })
          .limit(20),
      ]);
      return {
        records: (recordsRes.data ?? []) as StudentRecordRow[],
        mentors: (mentorsRes.data ?? []) as Array<
          Pick<MentorProfileRow, "user_id" | "full_name" | "subjects" | "languages">
        >,
        logs: (logsRes.data ?? []) as ProgressLogRow[],
      };
    },
  });

  const data = studentQuery.data;
  const record = data?.records[0];

  return (
    <div className="mt-12 space-y-6">
      <div className="trust-banner">
        <ShieldCheck size={18} />
        <div>
          <strong>Student Learning Portal:</strong> View your own learning record, assigned mentor
          and recorded lectures. You never have access to other students’ details.
        </div>
      </div>

      <div className="form-panel">
        <div className="section-head mb-4">
          <div>
            <div className="eyebrow">
              <BookOpen size={13} /> My learning overview
            </div>
            <h2>{record ? `Welcome, ${record.first_name}` : "My student dashboard"}</h2>
          </div>
          <Button asChild>
            <Link to="/learn">Watch recorded lectures</Link>
          </Button>
        </div>

        {studentQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading your learning details…</p>
        ) : !record ? (
          <div className="empty-state">
            Your student profile is approved! Once the Rabata administrator links your account to
            your classroom record and mentor, your attendance and progress notes will appear here.
            Meanwhile, you can explore all lessons in{" "}
            <Link to="/learn" className="text-link">
              Learn with Rabata
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-4">
            <div className="ledger-badges">
              <span className="pill-badge pill-green">Class {record.class_level}</span>
              <span className="pill-badge">
                Attendance: {record.attendance_count}/{record.total_sessions} sessions
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Subjects:</strong> {record.subjects_needed} ·{" "}
              <strong>Preferred format:</strong> {record.preferred_format}
            </p>
            {record.progress_summary && (
              <p className="text-xs text-foreground">
                <strong>Progress summary:</strong> {record.progress_summary}
              </p>
            )}
            {(data?.mentors.length ?? 0) > 0 && (
              <div className="border-t pt-3">
                <strong className="text-xs">Assigned Mentor(s):</strong>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {data?.mentors.map((m) => (
                    <li key={m.user_id}>
                      {m.full_name || "Rabata Mentor"} ({m.subjects || "General support"})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(data?.logs.length ?? 0) > 0 && (
              <div className="border-t pt-3">
                <strong className="text-xs">Recent Sessions:</strong>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {data?.logs.map((l) => (
                    <li key={l.id}>
                      <strong>{l.session_date}</strong> ({l.attendance_status}) — {l.topic_covered}
                      {l.remarks ? `: ${l.remarks}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
