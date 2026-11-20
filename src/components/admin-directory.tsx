import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Check, Link2, Mail, PhoneCall, Sparkles, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, type RoleRow } from "@/lib/access";
import { enquirySchema } from "@/lib/enquiry-schema";
import { submitEnquiry, type AdminEnquiryItem } from "@/lib/enquiries.functions";
import {
  appendLocalEnquiry,
  isLocalDevHost,
  makeLocalId,
  shouldUseLocalMode,
  updateLocalDb,
} from "@/lib/local-store";
import {
  CLASS_LEVELS,
  type AssignmentRow,
  type MentorProfileRow,
  type ProgressLogRow,
  type StudentRecordRow,
} from "@/lib/platform";

const VOICE_SCENARIOS = [
  {
    id: "hindi-derabassi",
    label: "Hindi Call · Derabassi",
    studentName: "Ananya Kumari",
    guardianEmail: "parent.ananya@example.com",
    classLevel: "4–5",
    subjects: "Spoken English, Mathematics",
    language: "Hindi",
    format: "In person",
    transcript:
      "Voice Agent Transcript (Hindi): Parent from Derabassi called the Rabata helpline requesting Class 5 English reading fluency and foundational Mathematics coaching.",
  },
  {
    id: "punjabi-mubarakpur",
    label: "Punjabi Call · Mubarakpur",
    studentName: "Harpreet Singh",
    guardianEmail: "family.harpreet@example.com",
    classLevel: "6–8",
    subjects: "Science, Computer Literacy",
    language: "Punjabi",
    format: "In person",
    transcript:
      "Voice Agent Transcript (Punjabi): Grandfather called to enroll Harpreet for after-school Science revision and basic computer typing.",
  },
  {
    id: "youth-interview",
    label: "Youth Call · Interview Prep",
    studentName: "Simran Kaur",
    guardianEmail: "simran.career@example.com",
    classLevel: "Young adult",
    subjects: "Spoken English, Career readiness",
    language: "Hindi and English",
    format: "Online",
    transcript:
      "Voice Agent Transcript (Bilingual): Young adult applicant preparing for retail store customer service interviews.",
  },
] as const;

export function AdminAccessAndEnquiriesPanel({
  roles,
  names,
  enquiries,
  onStatus,
}: {
  roles: RoleRow[];
  names: Record<string, string>;
  enquiries: AdminEnquiryItem[];
  onStatus: (msg: string, isErr?: boolean) => void;
}) {
  const qc = useQueryClient();
  const submitEnquiryFn = useServerFn(submitEnquiry);
  const [kindFilter, setKindFilter] = useState<"all" | "student" | "volunteer" | "contact">("all");
  const [voiceName, setVoiceName] = useState<string>(VOICE_SCENARIOS[0].studentName);
  const [voiceEmail, setVoiceEmail] = useState<string>(VOICE_SCENARIOS[0].guardianEmail);
  const [voiceClass, setVoiceClass] = useState<string>(VOICE_SCENARIOS[0].classLevel);
  const [voiceSubjects, setVoiceSubjects] = useState<string>(VOICE_SCENARIOS[0].subjects);
  const [voiceLang, setVoiceLang] = useState<string>(VOICE_SCENARIOS[0].language);
  const [voiceFormat, setVoiceFormat] = useState<string>(VOICE_SCENARIOS[0].format);
  const [voiceTranscript, setVoiceTranscript] = useState<string>(VOICE_SCENARIOS[0].transcript);
  const [voiceBusy, setVoiceBusy] = useState(false);

  function loadVoicePreset(presetId: string) {
    const found = VOICE_SCENARIOS.find((s) => s.id === presetId);
    if (!found) return;
    setVoiceName(found.studentName);
    setVoiceEmail(found.guardianEmail);
    setVoiceClass(found.classLevel);
    setVoiceSubjects(found.subjects);
    setVoiceLang(found.language);
    setVoiceFormat(found.format);
    setVoiceTranscript(found.transcript);
  }

  async function simulateVoiceIntake(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = enquirySchema.safeParse({
      kind: "student",
      name: voiceName,
      email: voiceEmail,
      classLevel: voiceClass,
      subjects: voiceSubjects,
      language: voiceLang,
      format: voiceFormat,
      message: voiceTranscript,
      consent: true,
      website: "",
    });
    if (!parsed.success) {
      onStatus(parsed.error.issues[0]?.message || "Invalid voice agent payload.", true);
      return;
    }

    setVoiceBusy(true);
    try {
      const localEntry: AdminEnquiryItem = {
        id: makeLocalId("voice"),
        created_at: new Date().toISOString(),
        kind: "student",
        name: parsed.data.name,
        email: parsed.data.email,
        consent: true,
        details: {
          channel: "Inbound Voice Agent",
          classLevel: parsed.data.classLevel ?? "",
          subjects: parsed.data.subjects ?? "",
          language: parsed.data.language ?? "",
          format: parsed.data.format ?? "",
          message: parsed.data.message,
        },
      };

      if (isLocalDevHost()) {
        appendLocalEnquiry(localEntry);
      }

      if (!shouldUseLocalMode()) {
        const res = await submitEnquiryFn({ data: parsed.data });
        if (!res.success && !isLocalDevHost()) {
          onStatus(res.message || "Voice agent intake could not be saved.", true);
          return;
        }
      }

      onStatus(
        `Inbound Voice Agent call for ${parsed.data.name} logged via enquirySchema. Review below and click “Add to Student Database” to enroll.`,
      );
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } finally {
      setVoiceBusy(false);
    }
  }

  async function review(id: string, decision: "active" | "rejected") {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        user_roles: db.user_roles.map((r) => (r.id === id ? { ...r, status: decision } : r)),
      }));
      onStatus(decision === "active" ? "Access approved." : "Request rejected.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }

    const { error } = await supabase.rpc("review_app_role", {
      p_role_id: id,
      p_decision: decision,
    });
    onStatus(
      error
        ? friendlyError(error.message)
        : decision === "active"
          ? "Access approved."
          : "Request rejected.",
      Boolean(error),
    );
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  async function convertEnquiryToStudent(item: AdminEnquiryItem) {
    const d = item.details;
    const classLevel =
      typeof d["classLevel"] === "string" && d["classLevel"] ? d["classLevel"] : "1–3";
    const subjects =
      typeof d["subjects"] === "string" && d["subjects"] ? d["subjects"] : "General support";
    const language =
      typeof d["language"] === "string" && d["language"] ? d["language"] : "Hindi and English";
    const format = typeof d["format"] === "string" && d["format"] ? d["format"] : "In person";
    const notes = typeof d["message"] === "string" ? d["message"] : null;

    const saveLocal = () => {
      const now = new Date().toISOString();
      const rec: StudentRecordRow = {
        id: makeLocalId("stu"),
        student_user_id: null,
        first_name: item.name.slice(0, 100),
        guardian_name: null,
        guardian_email: item.email,
        guardian_phone: null,
        class_level: classLevel.slice(0, 40),
        subjects_needed: subjects.slice(0, 300),
        preferred_language: language.slice(0, 80),
        preferred_format: format.slice(0, 80),
        learning_goals: notes ? notes.slice(0, 1000) : null,
        attendance_count: 0,
        total_sessions: 0,
        progress_summary: null,
        status: "active",
        guardian_consent: true,
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      updateLocalDb((db) => ({ ...db, student_records: [rec, ...db.student_records] }));
    };

    if (shouldUseLocalMode()) {
      saveLocal();
      onStatus(
        `Created student record for ${item.name}. You can assign a mentor in the Database tab.`,
      );
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }

    const { error } = await supabase.from("student_records").insert({
      first_name: item.name.slice(0, 100),
      guardian_email: item.email,
      class_level: classLevel.slice(0, 40),
      subjects_needed: subjects.slice(0, 300),
      preferred_language: language.slice(0, 80),
      preferred_format: format.slice(0, 80),
      learning_goals: notes ? notes.slice(0, 1000) : null,
      guardian_consent: true,
    });

    if (shouldUseLocalMode(error)) {
      saveLocal();
      onStatus(`Created student record for ${item.name} in local preview.`);
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }

    if (error) {
      onStatus(`Could not create student record: ${error.message}`, true);
      return;
    }
    onStatus(
      `Created student record for ${item.name}. You can assign a mentor in the Database tab.`,
    );
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  const filteredEnquiries = enquiries.filter(
    (item) => kindFilter === "all" || item.kind === kindFilter,
  );

  return (
    <div className="space-y-10">
      <div>
        <h2>Access requests</h2>
        <p className="section-copy">
          Approve or reject mentor and student sign-up requests before granting access to any
          database records.
        </p>
        {roles.filter((r) => r.role !== "admin").length === 0 ? (
          <div className="empty-state mt-4">No accounts have requested access yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {roles
              .filter((r) => r.role !== "admin")
              .map((r) => (
                <div key={r.id} className="ledger-row" style={{ padding: 16 }}>
                  <div>
                    <strong>{names[r.user_id] || "Unnamed account"}</strong>{" "}
                    <span className="pill-badge capitalize">{r.role}</span>{" "}
                    <span className={`pill-badge ${r.status === "active" ? "pill-green" : ""}`}>
                      {r.status === "active" ? "approved" : r.status}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => review(r.id, "active")}>
                        <Check size={14} /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => review(r.id, "rejected")}>
                        <X size={14} /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <form className="form-panel" onSubmit={simulateVoiceIntake}>
        <div className="eyebrow">
          <PhoneCall size={13} /> Inbound Calling Voice Agent · Live Helpline Simulator
        </div>
        <h2>Automated Voice Call Student Intake</h2>
        <p className="section-copy">
          Parents who cannot read or type English can call Rabata’s multilingual voice helpline in
          Hindi or Punjabi. The voice agent captures structured admission details validated through{" "}
          <code>enquirySchema</code> and pushes them straight into the Admin Enquiries Inbox.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {VOICE_SCENARIOS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => loadVoicePreset(preset.id)}
            >
              <Sparkles size={13} /> {preset.label}
            </Button>
          ))}
        </div>

        <div className="form-grid mt-5">
          <label className="field">
            Caller / Student First Name *
            <input
              required
              maxLength={100}
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
            />
          </label>
          <label className="field">
            Parent / Contact Email *
            <input
              type="email"
              required
              maxLength={255}
              value={voiceEmail}
              onChange={(e) => setVoiceEmail(e.target.value)}
            />
          </label>
          <label className="field">
            Class Level *
            <select value={voiceClass} onChange={(e) => setVoiceClass(e.target.value)}>
              {CLASS_LEVELS.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Subjects Needed *
            <input
              required
              maxLength={200}
              value={voiceSubjects}
              onChange={(e) => setVoiceSubjects(e.target.value)}
            />
          </label>
          <label className="field">
            Spoken Language Detected
            <select value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)}>
              <option value="Hindi">Hindi</option>
              <option value="Punjabi">Punjabi</option>
              <option value="English">English</option>
              <option value="Hindi and English">Hindi and English</option>
            </select>
          </label>
          <label className="field">
            Preferred Format
            <select value={voiceFormat} onChange={(e) => setVoiceFormat(e.target.value)}>
              <option value="In person">In person</option>
              <option value="Online">Online</option>
              <option value="Either">Either</option>
            </select>
          </label>
          <label className="field wide">
            Extracted Voice Call Summary / Transcript *
            <textarea
              required
              minLength={5}
              maxLength={2000}
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
            />
          </label>
        </div>

        <Button type="submit" disabled={voiceBusy} className="mt-4">
          <PhoneCall size={14} />{" "}
          {voiceBusy ? "Logging Voice Call Intake…" : "Simulate Inbound Voice Agent Call"}
        </Button>
      </form>

      <div>
        <div className="section-head">
          <div>
            <div className="eyebrow">
              <Mail size={13} /> Server-verified inbox
            </div>
            <h2>Submitted enquiries &amp; registrations ({filteredEnquiries.length})</h2>
            <p className="section-copy">
              Contact, student registration and volunteer applications submitted through the public
              forms. Stored server-side only.
            </p>
          </div>
          <select
            aria-label="Filter enquiries by type"
            className="border rounded px-3 py-2 text-xs bg-background"
            value={kindFilter}
            onChange={(e) =>
              setKindFilter(e.target.value as "all" | "student" | "volunteer" | "contact")
            }
          >
            <option value="all">All submissions</option>
            <option value="student">Student registrations</option>
            <option value="volunteer">Volunteer applications</option>
            <option value="contact">General contact messages</option>
          </select>
        </div>

        {filteredEnquiries.length === 0 ? (
          <div className="empty-state">No enquiries match this filter yet.</div>
        ) : (
          <div className="grid gap-3">
            {filteredEnquiries.map((item) => (
              <article key={item.id} className="ledger-row" style={{ alignItems: "flex-start" }}>
                <div className="ledger-main">
                  <div className="ledger-badges">
                    <span className="pill-badge pill-green capitalize">{item.kind}</span>
                    {item.details["channel"] && (
                      <span className="pill-badge pill-gold">
                        <PhoneCall size={11} /> {item.details["channel"]}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold">
                    {item.name} ·{" "}
                    <span className="font-normal text-muted-foreground">{item.email}</span>
                  </h3>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {Object.entries(item.details).map(([k, val]) =>
                      val ? (
                        <div key={k}>
                          <strong className="capitalize text-foreground">{k}:</strong> {String(val)}
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
                {item.kind === "student" && (
                  <Button size="sm" variant="outline" onClick={() => convertEnquiryToStudent(item)}>
                    <UserPlus size={14} /> Add to Student Database
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminDatabasePanel({
  roles,
  names,
  mentors,
  students,
  assignments,
  logs,
  onStatus,
}: {
  roles: RoleRow[];
  names: Record<string, string>;
  mentors: MentorProfileRow[];
  students: StudentRecordRow[];
  assignments: AssignmentRow[];
  logs: ProgressLogRow[];
  onStatus: (msg: string, isErr?: boolean) => void;
}) {
  const qc = useQueryClient();
  const activeMentorRoles = roles.filter((r) => r.role === "mentor" && r.status === "active");
  const activeStudentRoles = roles.filter((r) => r.role === "student" && r.status === "active");

  const mentorNameMap = new Map<string, string>();
  for (const r of activeMentorRoles) {
    mentorNameMap.set(r.user_id, names[r.user_id] || "Mentor");
  }
  for (const m of mentors) {
    if (m.full_name) mentorNameMap.set(m.user_id, m.full_name);
  }

  async function addStudent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (v["guardian_consent"] !== "on") {
      onStatus("Confirm parent/guardian consent before adding a student.", true);
      return;
    }

    const row: StudentRecordRow = {
      id: makeLocalId("stu"),
      student_user_id: (v["student_user_id"] ?? "").trim() || null,
      first_name: (v["first_name"] ?? "").trim().slice(0, 100),
      guardian_name: (v["guardian_name"] ?? "").trim().slice(0, 120) || null,
      guardian_email: (v["guardian_email"] ?? "").trim().slice(0, 255),
      guardian_phone: (v["guardian_phone"] ?? "").trim().slice(0, 40) || null,
      class_level: (v["class_level"] ?? "").trim().slice(0, 40),
      subjects_needed: (v["subjects_needed"] ?? "").trim().slice(0, 300),
      preferred_language:
        (v["preferred_language"] ?? "").trim().slice(0, 80) || "Hindi and English",
      preferred_format: (v["preferred_format"] ?? "").trim().slice(0, 80) || "In person",
      learning_goals: (v["learning_goals"] ?? "").trim().slice(0, 1000) || null,
      attendance_count: 0,
      total_sessions: 0,
      progress_summary: null,
      status: "active",
      guardian_consent: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({ ...db, student_records: [row, ...db.student_records] }));
      form.reset();
      onStatus("Student added to central database.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }

    const { error } = await supabase.from("student_records").insert({
      first_name: row.first_name,
      guardian_name: row.guardian_name,
      guardian_email: row.guardian_email,
      guardian_phone: row.guardian_phone,
      class_level: row.class_level,
      subjects_needed: row.subjects_needed,
      preferred_language: row.preferred_language,
      preferred_format: row.preferred_format,
      learning_goals: row.learning_goals,
      student_user_id: row.student_user_id,
      guardian_consent: true,
    });
    if (shouldUseLocalMode(error)) {
      updateLocalDb((db) => ({ ...db, student_records: [row, ...db.student_records] }));
      form.reset();
      onStatus("Student added to local preview database.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }
    if (error) {
      onStatus(`Could not add student: ${error.message}`, true);
      return;
    }
    form.reset();
    onStatus("Student added to central database.");
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  async function assignMentor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const mentorId = (v["mentor_user_id"] ?? "").trim();
    const studentId = (v["student_id"] ?? "").trim();
    if (!mentorId || !studentId) {
      onStatus("Select both a mentor and a student to assign.", true);
      return;
    }
    const subjects = (v["subjects"] ?? "").trim().slice(0, 200);
    const scheduleNotes = (v["schedule_notes"] ?? "").trim().slice(0, 300) || null;

    const saveLocal = () => {
      const entry: AssignmentRow = {
        id: makeLocalId("asgn"),
        mentor_user_id: mentorId,
        student_id: studentId,
        subjects,
        schedule_notes: scheduleNotes,
        active: true,
        assigned_by: null,
        assigned_at: new Date().toISOString(),
      };
      updateLocalDb((db) => ({
        ...db,
        mentor_student_assignments: [
          entry,
          ...db.mentor_student_assignments.filter(
            (a) => !(a.mentor_user_id === mentorId && a.student_id === studentId),
          ),
        ],
      }));
    };

    if (shouldUseLocalMode()) {
      saveLocal();
      form.reset();
      onStatus("Mentor assigned to student.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }

    const { error } = await supabase.from("mentor_student_assignments").upsert(
      {
        mentor_user_id: mentorId,
        student_id: studentId,
        subjects,
        schedule_notes: scheduleNotes,
        active: true,
      },
      { onConflict: "mentor_user_id,student_id" },
    );
    if (shouldUseLocalMode(error)) {
      saveLocal();
      form.reset();
      onStatus("Mentor assigned to student in local preview.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }
    if (error) {
      onStatus(`Could not assign mentor: ${error.message}`, true);
      return;
    }
    form.reset();
    onStatus("Mentor assigned to student.");
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  async function removeAssignment(id: string) {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        mentor_student_assignments: db.mentor_student_assignments.filter((a) => a.id !== id),
      }));
      onStatus("Assignment removed.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }
    const { error } = await supabase.from("mentor_student_assignments").delete().eq("id", id);
    onStatus(error ? error.message : "Assignment removed.", Boolean(error));
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  async function updateStudentStatus(id: string, status: "active" | "paused" | "completed") {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        student_records: db.student_records.map((s) =>
          s.id === id ? { ...s, status, updated_at: new Date().toISOString() } : s,
        ),
      }));
      onStatus("Student status updated.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }
    const { error } = await supabase
      .from("student_records")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    onStatus(error ? error.message : "Student status updated.", Boolean(error));
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  async function deleteStudent(id: string) {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        student_records: db.student_records.filter((s) => s.id !== id),
        mentor_student_assignments: db.mentor_student_assignments.filter(
          (a) => a.student_id !== id,
        ),
      }));
      onStatus("Student record deleted.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }
    const { error } = await supabase.from("student_records").delete().eq("id", id);
    onStatus(error ? error.message : "Student record deleted.", Boolean(error));
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  return (
    <div className="space-y-10">
      <div>
        <h2>Approved Mentors ({activeMentorRoles.length})</h2>
        <p className="section-copy">
          Only the administrator sees all mentor profiles. Individual mentors can access only their
          own profile and assigned students.
        </p>
        {activeMentorRoles.length === 0 ? (
          <div className="empty-state mt-4">No approved mentors yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {activeMentorRoles.map((role) => {
              const mp = mentors.find((m) => m.user_id === role.user_id);
              return (
                <div key={role.user_id} className="ledger-row">
                  <div>
                    <strong>{mp?.full_name || names[role.user_id] || "Approved Mentor"}</strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mp ? (
                        <>
                          {mp.email} · {mp.phone || "No phone"} · <strong>Subjects:</strong>{" "}
                          {mp.subjects || "Not specified"} · <strong>Qualifications:</strong>{" "}
                          {mp.qualifications || "Not specified"}
                          {mp.availability ? ` · Availability: ${mp.availability}` : ""}
                        </>
                      ) : (
                        "Mentor has not completed their detailed profile yet."
                      )}
                    </p>
                  </div>
                  <span className="pill-badge pill-green">Active Mentor</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form className="form-panel" onSubmit={assignMentor}>
        <div className="eyebrow">
          <Link2 size={13} /> Mentor-Student Assignment
        </div>
        <h2>Assign a mentor to a student</h2>
        <div className="form-grid">
          <label className="field">
            Approved mentor *
            <select name="mentor_user_id" required defaultValue="">
              <option value="" disabled>
                Choose mentor
              </option>
              {activeMentorRoles.map((r) => (
                <option key={r.user_id} value={r.user_id}>
                  {mentorNameMap.get(r.user_id) || r.user_id}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Student *
            <select name="student_id" required defaultValue="">
              <option value="" disabled>
                Choose student
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} (Class {s.class_level})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Assigned subjects
            <input name="subjects" maxLength={200} placeholder="e.g. Spoken English, Science" />
          </label>
          <label className="field">
            Schedule notes
            <input name="schedule_notes" maxLength={300} placeholder="e.g. Mon & Wed 5 PM" />
          </label>
        </div>
        <Button type="submit" className="mt-5">
          Assign mentor to student
        </Button>

        {assignments.length > 0 && (
          <div className="mt-6 border-t pt-4 space-y-2">
            <strong className="text-xs">Active Mentor-Student Assignments</strong>
            {assignments.map((a) => {
              const st = students.find((s) => s.id === a.student_id);
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <span>
                    <strong>{mentorNameMap.get(a.mentor_user_id) || "Mentor"}</strong> →{" "}
                    <strong>{st?.first_name || "Student"}</strong>
                    {a.subjects ? ` (${a.subjects})` : ""}
                    {a.schedule_notes ? ` · ${a.schedule_notes}` : ""}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => removeAssignment(a.id)}>
                    <Trash2 size={13} /> Unassign
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </form>

      <form className="form-panel" onSubmit={addStudent}>
        <div className="eyebrow">
          <UserPlus size={13} /> Central Student Database
        </div>
        <h2>Add a new student record</h2>
        <div className="form-grid">
          <label className="field">
            Student’s first name *
            <input name="first_name" required maxLength={100} />
          </label>
          <label className="field">
            Class *
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
            <input name="guardian_name" maxLength={120} />
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
            Subjects needed *
            <input name="subjects_needed" required maxLength={300} />
          </label>
          <label className="field">
            Link approved student account (optional)
            <select name="student_user_id" defaultValue="">
              <option value="">Not linked to login account</option>
              {activeStudentRoles.map((r) => (
                <option key={r.user_id} value={r.user_id}>
                  {names[r.user_id] || r.user_id}
                </option>
              ))}
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
            Learning goals
            <textarea name="learning_goals" maxLength={1000} />
          </label>
        </div>
        <label className="consent">
          <input type="checkbox" name="guardian_consent" required />
          <span>Guardian consent verified for storing this student’s learning details.</span>
        </label>
        <Button type="submit">Create student record</Button>
      </form>

      <div>
        <h2>All Student Records ({students.length})</h2>
        {students.length === 0 ? (
          <div className="empty-state mt-4">No student records created yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {students.map((s) => (
              <article key={s.id} className="ledger-row">
                <div className="ledger-main">
                  <div className="ledger-badges">
                    <span className="pill-badge pill-green">Class {s.class_level}</span>
                    <span className="pill-badge">{s.status}</span>
                    <span className="text-xs text-muted-foreground">
                      Attendance: {s.attendance_count}/{s.total_sessions}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold">{s.first_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Guardian:</strong> {s.guardian_name || "Parent/Guardian"} ·{" "}
                    {s.guardian_email} · <strong>Subjects:</strong> {s.subjects_needed}
                  </p>
                  {s.progress_summary && (
                    <p className="text-xs text-foreground mt-1">
                      <strong>Progress:</strong> {s.progress_summary}
                    </p>
                  )}
                </div>
                <div className="ledger-side">
                  <select
                    aria-label={`Change status for ${s.first_name}`}
                    className="border rounded px-2 py-1 text-xs bg-background"
                    value={s.status}
                    onChange={(e) =>
                      updateStudentStatus(s.id, e.target.value as "active" | "paused" | "completed")
                    }
                  >
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="completed">completed</option>
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => deleteStudent(s.id)}>
                    <Trash2 size={13} /> Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div>
          <h2>Recent Mentor Session Logs ({logs.length})</h2>
          <div className="mt-4 grid gap-2">
            {logs.slice(0, 15).map((l) => {
              const st = students.find((s) => s.id === l.student_id);
              return (
                <div key={l.id} className="ledger-row" style={{ padding: 14 }}>
                  <div className="text-xs">
                    <strong>{l.session_date}</strong> ·{" "}
                    <strong>{st?.first_name || "Student"}</strong> ·{" "}
                    <span className="capitalize">{l.attendance_status}</span> · {l.topic_covered}
                    {l.remarks ? ` — ${l.remarks}` : ""}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    By{" "}
                    {l.mentor_user_id ? mentorNameMap.get(l.mentor_user_id) || "Mentor" : "Staff"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
