import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Link2, Mail, PhoneCall, Plus, Sparkles, Trash2, UserPlus, X } from "lucide-react";
import { AdminModal } from "@/components/admin-modal";
import { AdminSarvamCallTracker } from "@/components/admin-sarvam-tracker";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, type RoleRow } from "@/lib/access";
import type { AdminEnquiryItem } from "@/lib/enquiries.functions";
import { makeLocalId, shouldUseLocalMode, updateLocalDb } from "@/lib/local-store";
import {
  CLASS_LEVELS,
  type AssignmentRow,
  type MentorProfileRow,
  type ProgressLogRow,
  type StudentRecordRow,
} from "@/lib/platform";
import {
  extractStudentDraftFromCall,
  extractStudentDraftFromEnquiry,
  markInteractionEnrolled,
  readEnrolledInteractionIds,
  updateSarvamCallStatus,
  type SarvamCallRecord,
} from "@/lib/sarvam-agent";

type EnrollModalTarget =
  { source: "call"; call: SarvamCallRecord } | { source: "enquiry"; enquiry: AdminEnquiryItem };

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
  const [subTab, setSubTab] = useState<"calls" | "inbox">("calls");
  const [kindFilter, setKindFilter] = useState<"all" | "student" | "volunteer" | "contact">("all");
  const [enrolledInteractionIds, setEnrolledInteractionIds] = useState<string[]>([]);
  const [enrollModalTarget, setEnrollModalTarget] = useState<EnrollModalTarget | null>(null);
  const [enrollError, setEnrollError] = useState("");
  const [savingEnroll, setSavingEnroll] = useState(false);

  useEffect(() => {
    setEnrolledInteractionIds(readEnrolledInteractionIds());
  }, []);

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

  async function confirmEnrollStudent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!enrollModalTarget) return;
    setEnrollError("");
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const firstName = (v["first_name"] ?? "").trim().slice(0, 100);
    const classLevel = (v["class_level"] ?? "").trim().slice(0, 40);
    const subjectsNeeded = (v["subjects_needed"] ?? "").trim().slice(0, 300);
    const guardianName = (v["guardian_name"] ?? "").trim().slice(0, 120) || null;
    const guardianEmail = (v["guardian_email"] ?? "").trim().slice(0, 255);
    const guardianPhone = (v["guardian_phone"] ?? "").trim().slice(0, 40) || null;
    const preferredLanguage =
      (v["preferred_language"] ?? "").trim().slice(0, 80) || "Hindi and English";
    const preferredFormat = (v["preferred_format"] ?? "").trim().slice(0, 80) || "In person";
    const learningGoals = (v["learning_goals"] ?? "").trim().slice(0, 1000) || null;
    const consentChecked = v["guardian_consent"] === "on";

    if (!firstName || !classLevel || !subjectsNeeded) {
      setEnrollError("Student name, class level, and subjects needed are required.");
      return;
    }
    if (!guardianEmail && !guardianPhone) {
      setEnrollError("Provide at least a parent/guardian phone number or email address.");
      return;
    }
    if (!consentChecked) {
      setEnrollError("Confirm parent/guardian consent before enrolling this student.");
      return;
    }

    setSavingEnroll(true);
    const now = new Date().toISOString();
    const rec: StudentRecordRow = {
      id: makeLocalId("stu"),
      student_user_id: null,
      first_name: firstName,
      guardian_name: guardianName,
      guardian_email: guardianEmail,
      guardian_phone: guardianPhone,
      class_level: classLevel,
      subjects_needed: subjectsNeeded,
      preferred_language: preferredLanguage,
      preferred_format: preferredFormat,
      learning_goals: learningGoals,
      attendance_count: 0,
      total_sessions: 0,
      progress_summary: null,
      status: "active",
      guardian_consent: true,
      created_by: null,
      created_at: now,
      updated_at: now,
    };

    const saveLocal = () => {
      updateLocalDb((db) => ({ ...db, student_records: [rec, ...db.student_records] }));
    };

    if (shouldUseLocalMode()) {
      saveLocal();
    } else {
      const { error } = await supabase.from("student_records").insert({
        first_name: rec.first_name,
        guardian_name: rec.guardian_name,
        guardian_email: rec.guardian_email,
        guardian_phone: rec.guardian_phone,
        class_level: rec.class_level,
        subjects_needed: rec.subjects_needed,
        preferred_language: rec.preferred_language,
        preferred_format: rec.preferred_format,
        learning_goals: rec.learning_goals,
        guardian_consent: true,
      });

      if (shouldUseLocalMode(error)) {
        saveLocal();
      } else if (error) {
        setSavingEnroll(false);
        setEnrollError(`Could not add student: ${error.message}`);
        return;
      }
    }

    if (enrollModalTarget.source === "call") {
      updateSarvamCallStatus(enrollModalTarget.call.id, "enrolled");
      setEnrolledInteractionIds(markInteractionEnrolled(enrollModalTarget.call.interaction_id));
    }

    setSavingEnroll(false);
    setEnrollModalTarget(null);
    onStatus(
      `Added ${firstName} (Class ${classLevel}) to Student Roster. You can assign a mentor under Mentors & Roster.`,
    );
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  const filteredEnquiries = enquiries.filter(
    (item) => kindFilter === "all" || item.kind === kindFilter,
  );
  const nonAdminRoles = roles.filter((r) => r.role !== "admin");

  const enrollDraft = enrollModalTarget
    ? enrollModalTarget.source === "call"
      ? extractStudentDraftFromCall(enrollModalTarget.call)
      : extractStudentDraftFromEnquiry(enrollModalTarget.enquiry)
    : null;
  const enrollModalKey = enrollModalTarget
    ? enrollModalTarget.source === "call"
      ? `call-${enrollModalTarget.call.interaction_id}`
      : `enq-${enrollModalTarget.enquiry.id}`
    : "closed";
  const callerTranscriptHighlights =
    enrollModalTarget?.source === "call"
      ? enrollModalTarget.call.interaction_transcript.filter(
          (t) =>
            t.role === "user" &&
            !/using a voice assistant to convert your voice to text/i.test(
              t.en_text || t.indic_text || "",
            ),
        )
      : [];

  return (
    <div className="space-y-6">
      <div className="admin-tabs" role="tablist" aria-label="Calls and enquiries workspace">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "calls"}
          className="tab-btn"
          onClick={() => setSubTab("calls")}
        >
          <PhoneCall size={14} /> Recent Calls &amp; Transcripts (+91 79654 81661)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "inbox"}
          className="tab-btn"
          onClick={() => setSubTab("inbox")}
        >
          <Mail size={14} /> Website Enquiries &amp; Approvals ({filteredEnquiries.length})
        </button>
      </div>

      {subTab === "calls" && (
        <AdminSarvamCallTracker
          dbEnquiries={enquiries}
          enrolledInteractionIds={enrolledInteractionIds}
          onRequestEnrollCall={(call) => {
            setEnrollError("");
            setEnrollModalTarget({ source: "call", call });
          }}
        />
      )}

      {subTab === "inbox" && (
        <div className="space-y-8">
          <div>
            <div className="admin-toolbar">
              <div>
                <h2>Account Access Requests ({nonAdminRoles.length})</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Approve or reject mentor and student sign-up requests.
                </p>
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role Requested</th>
                    <th>Status</th>
                    <th>Requested Date</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {nonAdminRoles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted-foreground py-8">
                        No accounts have requested access yet.
                      </td>
                    </tr>
                  ) : (
                    nonAdminRoles.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{names[r.user_id] || "Unnamed account"}</strong>
                        </td>
                        <td>
                          <span className="pill-badge capitalize">{r.role}</span>
                        </td>
                        <td>
                          <span
                            className={`pill-badge ${r.status === "active" ? "pill-green" : ""}`}
                          >
                            {r.status === "active" ? "Approved" : r.status}
                          </span>
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {new Date(r.requested_at).toLocaleDateString("en-IN")}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {r.status === "pending" && (
                            <div className="admin-actions">
                              <button
                                type="button"
                                className="admin-action-btn admin-action-btn-success"
                                onClick={() => review(r.id, "active")}
                              >
                                <Check size={13} /> Approve
                              </button>
                              <button
                                type="button"
                                className="admin-action-btn admin-action-btn-secondary"
                                onClick={() => review(r.id, "rejected")}
                              >
                                <X size={13} /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="admin-toolbar">
              <div>
                <h2>Website Enquiries &amp; Applications ({filteredEnquiries.length})</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Student registrations, volunteer applications, and messages submitted online.
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

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name &amp; Email</th>
                    <th>Type</th>
                    <th>Details / Message</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnquiries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted-foreground py-8">
                        No enquiries match this filter yet.
                      </td>
                    </tr>
                  ) : (
                    filteredEnquiries.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("en-IN")}
                        </td>
                        <td>
                          <strong>{item.name}</strong>
                          <div className="text-xs text-muted-foreground">{item.email}</div>
                        </td>
                        <td>
                          <span className="pill-badge pill-green capitalize">{item.kind}</span>
                        </td>
                        <td className="text-xs text-muted-foreground" style={{ maxWidth: 420 }}>
                          {item.details["classLevel"]
                            ? `Class ${item.details["classLevel"]} · `
                            : ""}
                          {item.details["subjects"] ? `${item.details["subjects"]} · ` : ""}
                          {item.details["message"] ?? ""}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {item.kind === "student" && (
                            <div className="admin-actions">
                              <button
                                type="button"
                                className="admin-action-btn admin-action-btn-primary"
                                onClick={() => {
                                  setEnrollError("");
                                  setEnrollModalTarget({ source: "enquiry", enquiry: item });
                                }}
                              >
                                <UserPlus size={13} /> Enroll
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AdminModal
        open={Boolean(enrollModalTarget && enrollDraft)}
        title="Review & Enroll Student"
        subtitle={
          enrollModalTarget?.source === "call"
            ? `Review pre-filled details from ${
                enrollModalTarget.call.channel === "sarvam_voice_call"
                  ? "the phone call transcript"
                  : "the website chat"
              } before adding to the roster.`
            : "Verify extracted registration details before adding this learner to the Student Roster."
        }
        onClose={() => {
          setEnrollError("");
          setEnrollModalTarget(null);
        }}
      >
        {enrollModalTarget && enrollDraft && (
          <form key={enrollModalKey} onSubmit={confirmEnrollStudent} className="space-y-4">
            {enrollDraft.prefilledFields.length > 0 && (
              <div className="trust-banner text-xs">
                <Sparkles size={15} />
                <div>
                  <strong>Pre-filled automatically:</strong>{" "}
                  {enrollDraft.prefilledFields.join(" · ")}. Review or edit any field below before
                  saving.
                </div>
              </div>
            )}

            {callerTranscriptHighlights.length > 0 && (
              <div className="enroll-transcript-preview">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Caller transcript highlights
                </div>
                <div className="space-y-1 text-xs text-foreground">
                  {callerTranscriptHighlights.map((turn, idx) => (
                    <div key={`${turn.turn_id}-${idx}`}>
                      &ldquo;{turn.indic_text || turn.en_text}&rdquo;
                    </div>
                  ))}
                </div>
              </div>
            )}

            {enrollError && (
              <div role="alert" className="form-status form-error mb-0">
                {enrollError}
              </div>
            )}

            <div className="form-grid">
              <label className="field">
                Student’s first name *
                <input
                  name="first_name"
                  required
                  maxLength={100}
                  defaultValue={enrollDraft.first_name}
                  placeholder="Enter student first name"
                />
              </label>
              <label className="field">
                Class *
                <select name="class_level" required defaultValue={enrollDraft.class_level}>
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
              <label className="field wide">
                Subjects or skills needed *
                <input
                  name="subjects_needed"
                  required
                  maxLength={300}
                  defaultValue={enrollDraft.subjects_needed}
                  placeholder="e.g. Spoken English, Mathematics, Science"
                />
              </label>
              <label className="field">
                Guardian / caller phone
                <input
                  name="guardian_phone"
                  maxLength={40}
                  defaultValue={enrollDraft.guardian_phone}
                  placeholder="+91..."
                />
              </label>
              <label className="field">
                Parent / guardian email
                <input
                  name="guardian_email"
                  type="email"
                  maxLength={255}
                  defaultValue={enrollDraft.guardian_email}
                  placeholder="Optional if phone provided"
                />
              </label>
              <label className="field">
                Parent / guardian name
                <input
                  name="guardian_name"
                  maxLength={120}
                  defaultValue={enrollDraft.guardian_name}
                  placeholder="Optional"
                />
              </label>
              <label className="field">
                Preferred language
                <input
                  name="preferred_language"
                  maxLength={80}
                  defaultValue={enrollDraft.preferred_language}
                />
              </label>
              <label className="field">
                Format
                <select name="preferred_format" defaultValue={enrollDraft.preferred_format}>
                  <option value="In person">In person</option>
                  <option value="Online">Online</option>
                  <option value="Either">Either</option>
                </select>
              </label>
              <label className="field wide">
                Notes &amp; learning goals
                <textarea
                  name="learning_goals"
                  maxLength={1000}
                  defaultValue={enrollDraft.learning_goals}
                  placeholder="Summary from call or learning needs"
                />
              </label>
            </div>

            <label className="consent">
              <input
                type="checkbox"
                name="guardian_consent"
                required
                defaultChecked={enrollDraft.guardian_consent}
              />
              <span>
                Parent/guardian or adult learner consent verified to store these learning details in
                the Student Roster.
              </span>
            </label>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEnrollError("");
                  setEnrollModalTarget(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingEnroll}>
                <UserPlus size={14} /> {savingEnroll ? "Enrolling..." : "Confirm & Enroll Student"}
              </Button>
            </div>
          </form>
        )}
      </AdminModal>
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
  const [subTab, setSubTab] = useState<"students" | "mentors" | "pairings" | "logs">("students");
  const [modalKind, setModalKind] = useState<"student" | "assign" | null>(null);

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
      setModalKind(null);
      onStatus("Student added to roster.");
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
      setModalKind(null);
      onStatus("Student added to roster.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }
    if (error) {
      onStatus(`Could not add student: ${error.message}`, true);
      return;
    }
    form.reset();
    setModalKind(null);
    onStatus("Student added to roster.");
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
      setModalKind(null);
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
      setModalKind(null);
      onStatus("Mentor assigned to student.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      return;
    }
    if (error) {
      onStatus(`Could not assign mentor: ${error.message}`, true);
      return;
    }
    form.reset();
    setModalKind(null);
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
    <div className="space-y-6">
      <div className="admin-toolbar">
        <div className="admin-tabs" style={{ borderBottom: 0, paddingBottom: 0, marginBottom: 0 }}>
          <button
            type="button"
            aria-selected={subTab === "students"}
            className="tab-btn"
            onClick={() => setSubTab("students")}
          >
            Students Roster ({students.length})
          </button>
          <button
            type="button"
            aria-selected={subTab === "mentors"}
            className="tab-btn"
            onClick={() => setSubTab("mentors")}
          >
            Approved Mentors ({activeMentorRoles.length})
          </button>
          <button
            type="button"
            aria-selected={subTab === "pairings"}
            className="tab-btn"
            onClick={() => setSubTab("pairings")}
          >
            Mentor-Student Pairings ({assignments.length})
          </button>
          <button
            type="button"
            aria-selected={subTab === "logs"}
            className="tab-btn"
            onClick={() => setSubTab("logs")}
          >
            Attendance Logs ({logs.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setModalKind("assign")}>
            <Link2 size={14} /> Assign Mentor
          </Button>
          <Button onClick={() => setModalKind("student")}>
            <Plus size={14} /> Add Student
          </Button>
        </div>
      </div>

      {subTab === "students" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Subjects</th>
                <th>Guardian Contact</th>
                <th>Attendance</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground py-8">
                    No student records created yet.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.first_name}</strong>
                    </td>
                    <td>
                      <span className="pill-badge pill-green">Class {s.class_level}</span>
                    </td>
                    <td className="text-xs text-muted-foreground">{s.subjects_needed}</td>
                    <td className="text-xs text-muted-foreground">
                      {[
                        s.guardian_name,
                        s.guardian_phone,
                        s.guardian_email && !s.guardian_email.endsWith(".local")
                          ? s.guardian_email
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Guardian"}
                    </td>
                    <td>
                      {s.attendance_count}/{s.total_sessions}
                    </td>
                    <td>
                      <select
                        aria-label={`Change status for ${s.first_name}`}
                        className="border rounded px-2 py-1 text-xs bg-background"
                        value={s.status}
                        onChange={(e) =>
                          updateStudentStatus(
                            s.id,
                            e.target.value as "active" | "paused" | "completed",
                          )
                        }
                      >
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                        <option value="completed">completed</option>
                      </select>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Button size="sm" variant="ghost" onClick={() => deleteStudent(s.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "mentors" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mentor Name</th>
                <th>Contact</th>
                <th>Subjects</th>
                <th>Qualifications</th>
                <th>Availability</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeMentorRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">
                    No approved mentors yet.
                  </td>
                </tr>
              ) : (
                activeMentorRoles.map((role) => {
                  const mp = mentors.find((m) => m.user_id === role.user_id);
                  return (
                    <tr key={role.user_id}>
                      <td>
                        <strong>{mp?.full_name || names[role.user_id] || "Approved Mentor"}</strong>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {mp?.email || "—"} {mp?.phone ? `· ${mp.phone}` : ""}
                      </td>
                      <td>{mp?.subjects || "—"}</td>
                      <td className="text-xs text-muted-foreground">{mp?.qualifications || "—"}</td>
                      <td className="text-xs text-muted-foreground">{mp?.availability || "—"}</td>
                      <td>
                        <span className="pill-badge pill-green">Active Mentor</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "pairings" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mentor</th>
                <th>Student</th>
                <th>Subjects</th>
                <th>Schedule</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">
                    No mentor-student pairings yet. Click &ldquo;Assign Mentor&rdquo; above.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => {
                  const st = students.find((s) => s.id === a.student_id);
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{mentorNameMap.get(a.mentor_user_id) || "Mentor"}</strong>
                      </td>
                      <td>
                        <strong>{st?.first_name || "Student"}</strong>
                      </td>
                      <td>{a.subjects || "All subjects"}</td>
                      <td className="text-xs text-muted-foreground">{a.schedule_notes || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <Button size="sm" variant="ghost" onClick={() => removeAssignment(a.id)}>
                          <Trash2 size={13} /> Unassign
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "logs" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Session Date</th>
                <th>Student</th>
                <th>Attendance</th>
                <th>Topic Covered</th>
                <th>Remarks</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">
                    No mentor session logs yet.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 30).map((l) => {
                  const st = students.find((s) => s.id === l.student_id);
                  return (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap text-xs text-muted-foreground">
                        {l.session_date}
                      </td>
                      <td>
                        <strong>{st?.first_name || "Student"}</strong>
                      </td>
                      <td>
                        <span
                          className={`pill-badge capitalize ${
                            l.attendance_status === "present" ? "pill-green" : ""
                          }`}
                        >
                          {l.attendance_status}
                        </span>
                      </td>
                      <td>{l.topic_covered}</td>
                      <td className="text-xs text-muted-foreground">{l.remarks || "—"}</td>
                      <td className="text-xs text-muted-foreground">
                        {l.mentor_user_id
                          ? mentorNameMap.get(l.mentor_user_id) || "Mentor"
                          : "Staff"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={modalKind === "student"}
        title="Add New Student Record"
        subtitle="Enroll a learner in Rabata's roster with parent/guardian consent."
        onClose={() => setModalKind(null)}
      >
        <form onSubmit={addStudent}>
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
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalKind(null)}>
              Cancel
            </Button>
            <Button type="submit">
              <UserPlus size={14} /> Create Student Record
            </Button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={modalKind === "assign"}
        title="Assign Mentor to Student"
        subtitle="Pair an active mentor with a learner and specify subjects or session timings."
        onClose={() => setModalKind(null)}
      >
        <form onSubmit={assignMentor}>
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
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalKind(null)}>
              Cancel
            </Button>
            <Button type="submit">
              <Link2 size={14} /> Assign Mentor
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
