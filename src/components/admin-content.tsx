import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  IndianRupee,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import { AdminModal } from "@/components/admin-modal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { makeLocalId, shouldUseLocalMode, updateLocalDb } from "@/lib/local-store";
import {
  calculateFundSummary,
  CLASS_LEVELS,
  DEFAULT_ACTIVITY_PHOTOS,
  extractYouTubeId,
  formatClassLabel,
  formatINR,
  FUND_CATEGORIES,
  LECTURE_SUBJECTS,
  PHOTO_CATEGORIES,
  STORY_FOCUS_AREAS,
  uploadPlatformFile,
  type ActivityPhotoRow,
  type FundAllocationRow,
  type FundAuditLogRow,
  type FundDonationRow,
  type RecordedLectureRow,
  type SuccessStoryRow,
} from "@/lib/platform";

export function AdminLecturesPanel({
  lectures,
  onStatus,
}: {
  lectures: RecordedLectureRow[];
  onStatus: (msg: string, isErr?: boolean) => void;
}) {
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All subjects");
  const [uploading, setUploading] = useState(false);

  const filtered = lectures.filter(
    (l) =>
      `${l.title} ${l.topic} ${l.instructor_name}`.toLowerCase().includes(search.toLowerCase()) &&
      (subjectFilter === "All subjects" || l.subject === subjectFilter),
  );

  async function addLecture(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const v = Object.fromEntries(formData) as Record<string, string>;
    const file = formData.get("video_file");
    let videoUrl = (v["video_url"] ?? "").trim();

    setUploading(true);
    try {
      if (file instanceof File && file.size > 0) {
        const res = await uploadPlatformFile("lecture-media", file, "lectures");
        videoUrl = res.url;
      }
      if (!videoUrl) {
        onStatus("Please provide a YouTube link or upload a video file.", true);
        return;
      }
      const youtubeId = extractYouTubeId(videoUrl);
      const row: RecordedLectureRow = {
        id: makeLocalId("lec"),
        title: (v["title"] ?? "").trim().slice(0, 200),
        subject: (v["subject"] ?? "English").trim(),
        class_level: (v["class_level"] ?? "All").trim(),
        topic: (v["topic"] ?? "General").trim().slice(0, 120),
        instructor_name: (v["instructor_name"] ?? "Tammana Rathore").trim().slice(0, 120),
        duration: (v["duration"] ?? "").trim().slice(0, 40) || null,
        description: (v["description"] ?? "").trim().slice(0, 1500),
        video_url: videoUrl.slice(0, 1000),
        youtube_id: youtubeId,
        thumbnail_url: null,
        is_published: true,
        created_by: null,
        created_at: new Date().toISOString(),
      };

      const saveLocal = () => {
        updateLocalDb((db) => ({ ...db, recorded_lectures: [row, ...db.recorded_lectures] }));
      };

      if (shouldUseLocalMode()) {
        saveLocal();
      } else {
        const { error } = await supabase.from("recorded_lectures").insert({
          title: row.title,
          subject: row.subject,
          class_level: row.class_level,
          topic: row.topic,
          instructor_name: row.instructor_name,
          duration: row.duration,
          description: row.description,
          video_url: row.video_url,
          youtube_id: row.youtube_id,
          is_published: true,
        });
        if (shouldUseLocalMode(error)) {
          saveLocal();
        } else if (error) {
          onStatus(`Could not save lecture: ${error.message}`, true);
          return;
        }
      }

      form.reset();
      setShowAddModal(false);
      onStatus("Recorded lecture published to Learn with Rabata.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["recorded-lectures"] });
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Lecture upload failed.", true);
    } finally {
      setUploading(false);
    }
  }

  async function togglePublish(lecture: RecordedLectureRow) {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        recorded_lectures: db.recorded_lectures.map((l) =>
          l.id === lecture.id ? { ...l, is_published: !l.is_published } : l,
        ),
      }));
      onStatus("Lecture visibility updated.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["recorded-lectures"] });
      return;
    }
    const { error } = await supabase
      .from("recorded_lectures")
      .update({ is_published: !lecture.is_published })
      .eq("id", lecture.id);
    onStatus(error ? error.message : "Lecture visibility updated.", Boolean(error));
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["recorded-lectures"] });
  }

  async function removeLecture(id: string) {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        recorded_lectures: db.recorded_lectures.filter((l) => l.id !== id),
      }));
      onStatus("Lecture deleted.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["recorded-lectures"] });
      return;
    }
    const { error } = await supabase.from("recorded_lectures").delete().eq("id", id);
    onStatus(error ? error.message : "Lecture deleted.", Boolean(error));
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["recorded-lectures"] });
  }

  const publishedCount = lectures.filter((l) => l.is_published).length;
  const hiddenCount = lectures.length - publishedCount;
  const uniqueSubjectsCount = new Set(lectures.map((l) => l.subject)).size;

  return (
    <div className="space-y-6">
      <div className="stat-cards">
        <article className="stat-card">
          <div className="stat-label">
            <Video size={14} /> Total Lectures
          </div>
          <div className="stat-value">{lectures.length}</div>
          <small className="stat-note">Uploaded to studio</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <CheckCircle2 size={14} /> Published Live
          </div>
          <div className="stat-value">{publishedCount}</div>
          <small className="stat-note">Visible on Learn with Rabata</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <Clock size={14} /> Hidden Drafts
          </div>
          <div className="stat-value">{hiddenCount}</div>
          <small className="stat-note">Paused from public view</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <BookOpen size={14} /> Subjects Covered
          </div>
          <div className="stat-value">{uniqueSubjectsCount}</div>
          <small className="stat-note">Across mentor recordings</small>
        </article>
      </div>

      <div className="admin-control-bar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search recorded lectures"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lecture title, topic, or teacher…"
          />
        </div>
        <select
          aria-label="Filter by subject"
          className="admin-control-select"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="All subjects">All Subjects ({lectures.length})</option>
          {LECTURE_SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="admin-control-actions">
          <button
            type="button"
            className="admin-action-btn admin-action-btn-primary admin-toolbar-btn"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={14} /> Add Lecture
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Lecture Title</th>
              <th>Subject</th>
              <th>Topic</th>
              <th>Class</th>
              <th>Instructor</th>
              <th>Duration</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted-foreground py-8">
                  No recorded lectures match your search.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong className="text-foreground">{l.title}</strong>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="pill-badge pill-green">{l.subject}</span>
                  </td>
                  <td className="text-xs text-muted-foreground">{l.topic}</td>
                  <td className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatClassLabel(l.class_level)}
                  </td>
                  <td className="whitespace-nowrap">{l.instructor_name}</td>
                  <td className="whitespace-nowrap text-xs text-muted-foreground">
                    {l.duration || "—"}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`pill-badge ${l.is_published ? "pill-green" : ""}`}>
                      {l.is_published ? "Published" : "Hidden"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-action-btn admin-action-btn-secondary"
                        onClick={() => togglePublish(l)}
                      >
                        {l.is_published ? "Hide" : "Publish"}
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn admin-action-btn-icon admin-action-btn-danger"
                        aria-label={`Delete ${l.title}`}
                        onClick={() => removeLecture(l.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={showAddModal}
        title="Add Recorded Lecture"
        subtitle="Paste a YouTube video link or upload an MP4/WebM file."
        onClose={() => setShowAddModal(false)}
      >
        <form onSubmit={addLecture}>
          <div className="form-grid">
            <label className="field wide">
              Lecture title *
              <input
                name="title"
                required
                maxLength={200}
                placeholder="e.g. Spoken English Part 1"
              />
            </label>
            <label className="field">
              Subject *
              <select name="subject" defaultValue="English">
                {LECTURE_SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Topic *
              <input name="topic" required maxLength={120} placeholder="e.g. Daily Conversations" />
            </label>
            <label className="field">
              Class level
              <select name="class_level" defaultValue="All">
                {CLASS_LEVELS.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All classes" : `Class ${c}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Instructor name
              <input name="instructor_name" maxLength={120} defaultValue="Tammana Rathore" />
            </label>
            <label className="field">
              Duration (optional)
              <input name="duration" maxLength={40} placeholder="e.g. 18 mins" />
            </label>
            <label className="field">
              YouTube or direct video URL
              <input
                name="video_url"
                maxLength={1000}
                placeholder="https://youtube.com/watch?v=..."
              />
            </label>
            <label className="field wide">
              Or upload recorded video file (MP4/WebM)
              <input name="video_file" type="file" accept="video/*" />
            </label>
            <label className="field wide">
              Lesson summary
              <textarea
                name="description"
                maxLength={1500}
                placeholder="What students will learn…"
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              <Video size={14} /> {uploading ? "Uploading…" : "Publish Lecture"}
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

export function AdminFundsPanel({
  donations,
  allocations,
  auditLogs,
  userId,
  onStatus,
}: {
  donations: FundDonationRow[];
  allocations: FundAllocationRow[];
  auditLogs: FundAuditLogRow[];
  userId: string;
  onStatus: (msg: string, isErr?: boolean) => void;
}) {
  const qc = useQueryClient();
  const [subView, setSubView] = useState<"allocations" | "donations" | "audit">("allocations");
  const [search, setSearch] = useState("");
  const [modalKind, setModalKind] = useState<"donation" | "allocation" | null>(null);
  const [busy, setBusy] = useState(false);
  const summary = calculateFundSummary(donations, allocations);

  const query = search.trim().toLowerCase();
  const filteredAllocations = allocations.filter((a) => {
    if (!query) return true;
    const text =
      `${a.entry_date} ${a.title} ${a.vendor_or_beneficiary ?? ""} ${a.category} ${a.entry_type}`.toLowerCase();
    return text.includes(query);
  });
  const filteredDonations = donations.filter((d) => {
    if (!query) return true;
    const text =
      `${d.received_date} ${d.donor_name} ${d.donor_email ?? ""} ${d.purpose} ${d.payment_reference ?? ""}`.toLowerCase();
    return text.includes(query);
  });
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!query) return true;
    const text = `${log.action} ${log.summary}`.toLowerCase();
    return text.includes(query);
  });

  async function logAudit(
    action: string,
    tableName: string,
    recordId: string | null,
    text: string,
  ) {
    const entry: FundAuditLogRow = {
      id: makeLocalId("aud"),
      action,
      table_name: tableName,
      record_id: recordId,
      summary: text.slice(0, 500),
      actor_user_id: userId,
      created_at: new Date().toISOString(),
    };
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({ ...db, fund_audit_logs: [entry, ...db.fund_audit_logs] }));
      return;
    }
    await supabase.from("fund_audit_logs").insert({
      action,
      table_name: tableName,
      record_id: recordId,
      summary: entry.summary,
      actor_user_id: userId,
    });
  }

  async function addDonation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const amount = Number(v["amount_inr"] ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      onStatus("Enter a valid amount greater than zero.", true);
      return;
    }
    const purpose =
      (v["purpose"] ?? "").trim().slice(0, 200) || "General Education & Community Fund";
    const isPublic = v["is_public_acknowledgement"] === "on";
    const publicLabel = (v["public_label"] ?? "").trim().slice(0, 120) || "Community Supporter";

    const row: FundDonationRow = {
      id: makeLocalId("don"),
      received_date: (v["received_date"] ?? "").trim() || new Date().toISOString().slice(0, 10),
      amount_inr: amount,
      donor_name: (v["donor_name"] ?? "").trim().slice(0, 160) || "Anonymous Supporter",
      donor_email: (v["donor_email"] ?? "").trim().slice(0, 255) || null,
      donor_phone: (v["donor_phone"] ?? "").trim().slice(0, 40) || null,
      purpose,
      payment_reference: (v["payment_reference"] ?? "").trim().slice(0, 120) || null,
      is_public_acknowledgement: isPublic,
      public_label: publicLabel,
      notes: (v["notes"] ?? "").trim().slice(0, 500) || null,
      recorded_by: userId,
      created_at: new Date().toISOString(),
    };

    const saveLocal = () => {
      updateLocalDb((db) => ({ ...db, fund_donations: [row, ...db.fund_donations] }));
    };

    if (shouldUseLocalMode()) {
      saveLocal();
      await logAudit(
        "CREATE",
        "fund_donations",
        row.id,
        `Recorded ₹${amount} received (${purpose})`,
      );
    } else {
      const { data, error } = await supabase
        .from("fund_donations")
        .insert({
          received_date: row.received_date,
          amount_inr: row.amount_inr,
          donor_name: row.donor_name,
          donor_email: row.donor_email,
          donor_phone: row.donor_phone,
          purpose: row.purpose,
          payment_reference: row.payment_reference,
          is_public_acknowledgement: row.is_public_acknowledgement,
          public_label: row.public_label,
          notes: row.notes,
          recorded_by: userId,
        })
        .select("id")
        .single();
      if (shouldUseLocalMode(error)) {
        saveLocal();
      } else if (error) {
        onStatus(`Could not record contribution: ${error.message}`, true);
        return;
      }
      await logAudit(
        "CREATE",
        "fund_donations",
        data?.id ?? row.id,
        `Recorded ₹${amount} received (${purpose})`,
      );
    }

    form.reset();
    setModalKind(null);
    onStatus("Contribution recorded securely.");
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["public-funds"] });
    qc.invalidateQueries({ queryKey: ["home-funds-summary"] });
  }

  async function addAllocation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const v = Object.fromEntries(formData) as Record<string, string>;
    const amount = Number(v["amount_inr"] ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      onStatus("Enter a valid non-negative amount.", true);
      return;
    }
    setBusy(true);
    try {
      let proofUrl = (v["proof_url"] ?? "").trim() || null;
      const file = formData.get("proof_file");
      if (file instanceof File && file.size > 0) {
        const res = await uploadPlatformFile("fund-proofs", file, "receipts");
        proofUrl = res.url;
      }
      const entryType = (v["entry_type"] ?? "expenditure") as "expenditure" | "planned_allocation";
      const title = (v["title"] ?? "").trim().slice(0, 200);
      const now = new Date().toISOString();
      const row: FundAllocationRow = {
        id: makeLocalId("alloc"),
        entry_date: (v["entry_date"] ?? "").trim() || now.slice(0, 10),
        entry_type: entryType,
        category: (v["category"] ?? FUND_CATEGORIES[0]).trim(),
        title,
        description: (v["description"] ?? "").trim().slice(0, 1500),
        amount_inr: amount,
        vendor_or_beneficiary: (v["vendor_or_beneficiary"] ?? "").trim().slice(0, 200) || null,
        proof_url: proofUrl ? proofUrl.slice(0, 2000) : null,
        proof_type: ((v["proof_type"] ?? "").trim() || null) as
          "receipt" | "bill" | "photograph" | "document" | null,
        proof_caption: (v["proof_caption"] ?? "").trim().slice(0, 300) || null,
        is_published: true,
        recorded_by: userId,
        created_at: now,
        updated_at: now,
      };

      const saveLocal = () => {
        updateLocalDb((db) => ({ ...db, fund_allocations: [row, ...db.fund_allocations] }));
      };

      if (shouldUseLocalMode()) {
        saveLocal();
        await logAudit(
          "CREATE",
          "fund_allocations",
          row.id,
          `Recorded ${entryType}: ${title} (₹${amount})`,
        );
      } else {
        const { data, error } = await supabase
          .from("fund_allocations")
          .insert({
            entry_date: row.entry_date,
            entry_type: row.entry_type,
            category: row.category,
            title: row.title,
            description: row.description,
            amount_inr: row.amount_inr,
            vendor_or_beneficiary: row.vendor_or_beneficiary,
            proof_url: row.proof_url,
            proof_type: row.proof_type,
            proof_caption: row.proof_caption,
            is_published: true,
            recorded_by: userId,
          })
          .select("id")
          .single();
        if (shouldUseLocalMode(error)) {
          saveLocal();
        } else if (error) {
          onStatus(`Could not save fund entry: ${error.message}`, true);
          return;
        }
        await logAudit(
          "CREATE",
          "fund_allocations",
          data?.id ?? row.id,
          `Recorded ${entryType}: ${title} (₹${amount})`,
        );
      }

      form.reset();
      setModalKind(null);
      onStatus("Fund allocation / expenditure published.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["public-funds"] });
      qc.invalidateQueries({ queryKey: ["home-funds-summary"] });
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Proof upload failed.", true);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAllocation(item: FundAllocationRow) {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        fund_allocations: db.fund_allocations.filter((a) => a.id !== item.id),
      }));
      await logAudit("DELETE", "fund_allocations", item.id, `Deleted: ${item.title}`);
      onStatus("Fund entry deleted.");
    } else {
      const { error } = await supabase.from("fund_allocations").delete().eq("id", item.id);
      if (!error) {
        await logAudit("DELETE", "fund_allocations", item.id, `Deleted: ${item.title}`);
      }
      onStatus(error ? error.message : "Fund entry deleted.", Boolean(error));
    }
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["public-funds"] });
    qc.invalidateQueries({ queryKey: ["home-funds-summary"] });
  }

  return (
    <div className="space-y-6">
      <div className="stat-cards">
        <button
          type="button"
          className={`stat-card is-clickable ${subView === "donations" ? "is-active" : ""}`}
          onClick={() => setSubView("donations")}
        >
          <div className="stat-label">
            <IndianRupee size={14} /> Received
          </div>
          <div className="stat-value">{formatINR(summary.totalReceivedInr)}</div>
          <small className="stat-note">{donations.length} logged contributions</small>
        </button>
        <button
          type="button"
          className={`stat-card is-clickable ${subView === "allocations" ? "is-active" : ""}`}
          onClick={() => setSubView("allocations")}
        >
          <div className="stat-label">
            <Receipt size={14} /> Spent
          </div>
          <div className="stat-value">{formatINR(summary.totalSpentInr)}</div>
          <small className="stat-note">With public receipts &amp; proofs</small>
        </button>
        <article className="stat-card">
          <div className="stat-label">
            <CheckCircle2 size={14} /> Available Balance
          </div>
          <div className="stat-value">{formatINR(summary.availableBalanceInr)}</div>
          <small className="stat-note">Ready for upcoming student needs</small>
        </article>
        <button
          type="button"
          className={`stat-card is-clickable ${subView === "audit" ? "is-active" : ""}`}
          onClick={() => setSubView("audit")}
        >
          <div className="stat-label">
            <Clock size={14} /> Planned
          </div>
          <div className="stat-value">{formatINR(summary.totalPlannedInr)}</div>
          <small className="stat-note">{auditLogs.length} audit trail entries</small>
        </button>
      </div>

      <div className="admin-control-bar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search expenses, donors, categories, or audit trail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses, donors, categories, or audit trail…"
          />
        </div>
        <select
          aria-label="Filter fund ledger section"
          className="admin-control-select"
          value={subView}
          onChange={(e) => setSubView(e.target.value as "allocations" | "donations" | "audit")}
        >
          <option value="allocations">Expenses &amp; Allocations ({allocations.length})</option>
          <option value="donations">Received Donations ({donations.length})</option>
          <option value="audit">Audit Trail ({auditLogs.length})</option>
        </select>
        <div className="admin-control-actions">
          <button
            type="button"
            className="admin-action-btn admin-action-btn-secondary admin-toolbar-btn"
            onClick={() => setModalKind("donation")}
          >
            <IndianRupee size={14} /> Record Donation
          </button>
          <button
            type="button"
            className="admin-action-btn admin-action-btn-primary admin-toolbar-btn"
            onClick={() => setModalKind("allocation")}
          >
            <Plus size={14} /> Add Expense
          </button>
        </div>
      </div>

      {subView === "allocations" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title &amp; Vendor</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Proof</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground py-8">
                    No fund allocations match your search.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                      {a.entry_date}
                    </td>
                    <td>
                      <strong>{a.title}</strong>
                      {a.vendor_or_beneficiary && (
                        <div className="text-xs text-muted-foreground">
                          {a.vendor_or_beneficiary}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="pill-badge">{a.category}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={`pill-badge ${a.entry_type === "expenditure" ? "pill-green" : "pill-gold"}`}
                      >
                        {a.entry_type === "expenditure" ? "Spent" : "Planned"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <strong>{formatINR(Number(a.amount_inr))}</strong>
                    </td>
                    <td className="whitespace-nowrap">
                      {a.proof_url ? (
                        <a
                          href={a.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-link"
                        >
                          View {a.proof_type ?? "proof"} <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn-icon admin-action-btn-danger"
                          aria-label={`Delete ${a.title}`}
                          onClick={() => deleteAllocation(a)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {subView === "donations" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Donor (Private)</th>
                <th>Purpose</th>
                <th>Public Visibility</th>
                <th>Reference</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">
                    No donations match your search.
                  </td>
                </tr>
              ) : (
                filteredDonations.map((d) => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                      {d.received_date}
                    </td>
                    <td>
                      <strong>{d.donor_name}</strong>
                      {d.donor_email && (
                        <div className="text-xs text-muted-foreground">{d.donor_email}</div>
                      )}
                    </td>
                    <td>{d.purpose}</td>
                    <td>
                      <span
                        className={`pill-badge ${d.is_public_acknowledgement ? "pill-green" : ""}`}
                      >
                        {d.is_public_acknowledgement ? d.public_label : "Private"}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">{d.payment_reference || "—"}</td>
                    <td>
                      <strong>{formatINR(Number(d.amount_inr))}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {subView === "audit" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-muted-foreground py-8">
                    No audit trail entries match your search.
                  </td>
                </tr>
              ) : (
                filteredAuditLogs.slice(0, 30).map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span className="pill-badge">{log.action}</span>
                    </td>
                    <td>{log.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={modalKind === "donation"}
        title="Record Received Contribution"
        subtitle="Donor email, phone, and payment references stay strictly private in Admin."
        onClose={() => setModalKind(null)}
      >
        <form onSubmit={addDonation}>
          <div className="form-grid">
            <label className="field">
              Date received *
              <input
                name="received_date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label className="field">
              Amount (INR) *
              <input
                name="amount_inr"
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="e.g. 2500"
              />
            </label>
            <label className="field">
              Donor name (admin private) *
              <input
                name="donor_name"
                required
                maxLength={160}
                placeholder="Full name or Anonymous"
              />
            </label>
            <label className="field">
              Donor email (admin private)
              <input name="donor_email" type="email" maxLength={255} />
            </label>
            <label className="field">
              Donor phone (admin private)
              <input name="donor_phone" maxLength={40} />
            </label>
            <label className="field">
              Payment / UPI / Bank ID (private)
              <input name="payment_reference" maxLength={120} />
            </label>
            <label className="field">
              Purpose
              <input
                name="purpose"
                maxLength={200}
                defaultValue="General Education & Community Fund"
              />
            </label>
            <label className="field">
              Public acknowledgement label
              <input name="public_label" maxLength={120} defaultValue="Community Supporter" />
            </label>
          </div>
          <label className="consent">
            <input type="checkbox" name="is_public_acknowledgement" />
            <span>Show public label &amp; amount on the Fund Transparency page.</span>
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalKind(null)}>
              Cancel
            </Button>
            <Button type="submit">Save Contribution</Button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={modalKind === "allocation"}
        title="Add Expense or Planned Allocation"
        subtitle="Attach bill, receipt, or photograph proofs published to the open ledger."
        onClose={() => setModalKind(null)}
      >
        <form onSubmit={addAllocation}>
          <div className="form-grid">
            <label className="field">
              Entry type *
              <select name="entry_type" defaultValue="expenditure">
                <option value="expenditure">Spent / Expenditure</option>
                <option value="planned_allocation">Planned Allocation</option>
              </select>
            </label>
            <label className="field">
              Category *
              <select name="category" defaultValue={FUND_CATEGORIES[0]}>
                {FUND_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Date *
              <input
                name="entry_date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label className="field">
              Amount (INR) *
              <input
                name="amount_inr"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="e.g. 1200"
              />
            </label>
            <label className="field wide">
              Title *
              <input
                name="title"
                required
                maxLength={200}
                placeholder="e.g. NCERT Notebooks & Stationery Set"
              />
            </label>
            <label className="field">
              Vendor / Beneficiary
              <input
                name="vendor_or_beneficiary"
                maxLength={200}
                placeholder="Shop name or community drive"
              />
            </label>
            <label className="field">
              Proof type
              <select name="proof_type" defaultValue="bill">
                <option value="bill">Bill</option>
                <option value="receipt">Receipt</option>
                <option value="photograph">Photograph</option>
                <option value="document">Document / PDF</option>
              </select>
            </label>
            <label className="field">
              Upload bill / receipt / photo
              <input name="proof_file" type="file" accept="image/*,.pdf" />
            </label>
            <label className="field">
              Or paste proof link (optional)
              <input name="proof_url" maxLength={2000} placeholder="https://..." />
            </label>
            <label className="field wide">
              Proof caption
              <input name="proof_caption" maxLength={300} placeholder="Brief note about the bill" />
            </label>
            <label className="field wide">
              Description of utilisation
              <textarea name="description" maxLength={1500} />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalKind(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Receipt size={14} /> {busy ? "Uploading…" : "Publish Entry"}
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

export function AdminStoriesAndPhotosPanel({
  stories,
  photos,
  userId,
  onStatus,
}: {
  stories: SuccessStoryRow[];
  photos: ActivityPhotoRow[];
  userId: string;
  onStatus: (msg: string, isErr?: boolean) => void;
}) {
  const qc = useQueryClient();
  const [subView, setSubView] = useState<"stories" | "photos">("stories");
  const [search, setSearch] = useState("");
  const [modalKind, setModalKind] = useState<"story" | "photo" | null>(null);
  const [busy, setBusy] = useState(false);

  async function addStory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const v = Object.fromEntries(formData) as Record<string, string>;
    const isAnonymous = v["is_anonymous"] === "on";
    const consentVerified = v["guardian_consent_verified"] === "on";
    if (!isAnonymous && !consentVerified) {
      onStatus("Non-anonymous stories require explicit guardian consent verification.", true);
      return;
    }
    setBusy(true);
    try {
      let imageUrl = (v["image_url"] ?? "").trim() || null;
      const file = formData.get("image_file");
      if (file instanceof File && file.size > 0) {
        const res = await uploadPlatformFile("community-media", file, "stories");
        imageUrl = res.url;
      }
      const row: SuccessStoryRow = {
        id: makeLocalId("sty"),
        title: (v["title"] ?? "").trim().slice(0, 200),
        focus_area: (v["focus_area"] ?? STORY_FOCUS_AREAS[0]).trim(),
        is_anonymous: isAnonymous,
        guardian_consent_verified: consentVerified,
        learner_display_name: isAnonymous
          ? "Anonymous Learner"
          : (v["learner_display_name"] ?? "").trim().slice(0, 120) || "Rabata Learner",
        class_or_age: (v["class_or_age"] ?? "").trim().slice(0, 80),
        story_summary: (v["story_summary"] ?? "").trim().slice(0, 2000),
        support_given: (v["support_given"] ?? "").trim().slice(0, 1000),
        achievement_or_progress: (v["achievement_or_progress"] ?? "").trim().slice(0, 1000),
        quote: (v["quote"] ?? "").trim().slice(0, 500) || null,
        image_url: imageUrl,
        is_published: true,
        created_by: userId,
        created_at: new Date().toISOString(),
      };

      const saveLocal = () => {
        updateLocalDb((db) => ({ ...db, success_stories: [row, ...db.success_stories] }));
      };

      if (shouldUseLocalMode()) {
        saveLocal();
      } else {
        const { error } = await supabase.from("success_stories").insert({
          title: row.title,
          focus_area: row.focus_area,
          is_anonymous: row.is_anonymous,
          guardian_consent_verified: row.guardian_consent_verified,
          learner_display_name: row.learner_display_name,
          class_or_age: row.class_or_age,
          story_summary: row.story_summary,
          support_given: row.support_given,
          achievement_or_progress: row.achievement_or_progress,
          quote: row.quote,
          image_url: row.image_url,
          is_published: true,
          created_by: userId,
        });
        if (shouldUseLocalMode(error)) {
          saveLocal();
        } else if (error) {
          onStatus(`Could not publish story: ${error.message}`, true);
          return;
        }
      }

      form.reset();
      setModalKind(null);
      onStatus("Success story published.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["success-stories"] });
      qc.invalidateQueries({ queryKey: ["home-success-stories"] });
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Upload failed.", true);
    } finally {
      setBusy(false);
    }
  }

  async function addPhoto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const v = Object.fromEntries(formData) as Record<string, string>;
    if (v["consent_verified"] !== "on") {
      onStatus("Confirm parent/guardian and participant consent before publishing a photo.", true);
      return;
    }
    setBusy(true);
    try {
      let imageUrl = (v["image_url"] ?? "").trim();
      const file = formData.get("photo_file");
      if (file instanceof File && file.size > 0) {
        const res = await uploadPlatformFile("community-media", file, "gallery");
        imageUrl = res.url;
      }
      if (!imageUrl) {
        onStatus("Upload a photo file or paste an image URL.", true);
        return;
      }
      const row: ActivityPhotoRow = {
        id: makeLocalId("pho"),
        title: (v["title"] ?? "").trim().slice(0, 160),
        category: (v["category"] ?? PHOTO_CATEGORIES[0]).trim(),
        caption: (v["caption"] ?? "").trim().slice(0, 600),
        image_url: imageUrl.slice(0, 2000),
        consent_verified: true,
        is_published: true,
        created_by: userId,
        created_at: new Date().toISOString(),
      };

      const saveLocal = () => {
        updateLocalDb((db) => ({ ...db, activity_photos: [row, ...db.activity_photos] }));
      };

      if (shouldUseLocalMode()) {
        saveLocal();
      } else {
        const { error } = await supabase.from("activity_photos").insert({
          title: row.title,
          category: row.category,
          caption: row.caption,
          image_url: row.image_url,
          consent_verified: true,
          is_published: true,
          created_by: userId,
        });
        if (shouldUseLocalMode(error)) {
          saveLocal();
        } else if (error) {
          onStatus(`Could not publish photo: ${error.message}`, true);
          return;
        }
      }

      form.reset();
      setModalKind(null);
      onStatus("Activity photo added to homepage gallery.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["home-activity-photos"] });
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Photo upload failed.", true);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStoryPublish(story: SuccessStoryRow) {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        success_stories: db.success_stories.map((s) =>
          s.id === story.id ? { ...s, is_published: !s.is_published } : s,
        ),
      }));
      onStatus("Success story visibility updated.");
    } else {
      const { error } = await supabase
        .from("success_stories")
        .update({ is_published: !story.is_published })
        .eq("id", story.id);
      onStatus(error ? error.message : "Success story visibility updated.", Boolean(error));
    }
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["success-stories"] });
    qc.invalidateQueries({ queryKey: ["home-success-stories"] });
  }

  async function togglePhotoPublish(photo: ActivityPhotoRow) {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        activity_photos: db.activity_photos.map((p) =>
          p.id === photo.id ? { ...p, is_published: !p.is_published } : p,
        ),
      }));
      onStatus("Photo visibility updated.");
    } else {
      const { error } = await supabase
        .from("activity_photos")
        .update({ is_published: !photo.is_published })
        .eq("id", photo.id);
      onStatus(error ? error.message : "Photo visibility updated.", Boolean(error));
    }
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["home-activity-photos"] });
  }

  async function restoreDefaultPhotos() {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => {
        const existingIds = new Set(db.activity_photos.map((p) => p.id));
        const missing = DEFAULT_ACTIVITY_PHOTOS.filter((d) => !existingIds.has(d.id));
        return {
          ...db,
          activity_photos: [...db.activity_photos, ...missing],
        };
      });
      onStatus("Default homepage gallery photos restored.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["home-activity-photos"] });
      return;
    }
    onStatus("Use Upload Gallery Photo to add photos to your live database.");
  }

  async function deleteStory(id: string) {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        success_stories: db.success_stories.filter((s) => s.id !== id),
      }));
      onStatus("Success story removed.");
    } else {
      const { error } = await supabase.from("success_stories").delete().eq("id", id);
      onStatus(error ? error.message : "Success story removed.", Boolean(error));
    }
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["success-stories"] });
    qc.invalidateQueries({ queryKey: ["home-success-stories"] });
  }

  async function deletePhoto(id: string) {
    if (shouldUseLocalMode()) {
      updateLocalDb((db) => ({
        ...db,
        activity_photos: db.activity_photos.filter((p) => p.id !== id),
      }));
      onStatus("Photo removed.");
    } else {
      const { error } = await supabase.from("activity_photos").delete().eq("id", id);
      onStatus(error ? error.message : "Photo removed.", Boolean(error));
    }
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["home-activity-photos"] });
  }

  const publishedStoriesCount = stories.filter((s) => s.is_published).length;
  const publishedPhotosCount = photos.filter((p) => p.is_published).length;
  const publishedTotalCount = publishedStoriesCount + publishedPhotosCount;
  const hiddenTotalCount = stories.length + photos.length - publishedTotalCount;

  const query = search.trim().toLowerCase();
  const filteredStories = stories.filter((s) => {
    if (!query) return true;
    const text = `${s.title} ${s.learner_display_name} ${s.focus_area}`.toLowerCase();
    return text.includes(query);
  });
  const filteredPhotos = photos.filter((p) => {
    if (!query) return true;
    const text = `${p.title} ${p.category} ${p.caption}`.toLowerCase();
    return text.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="stat-cards">
        <button
          type="button"
          className={`stat-card is-clickable ${subView === "stories" ? "is-active" : ""}`}
          onClick={() => setSubView("stories")}
        >
          <div className="stat-label">
            <Award size={14} /> Success Stories
          </div>
          <div className="stat-value">{stories.length}</div>
          <small className="stat-note">{publishedStoriesCount} published live</small>
        </button>
        <button
          type="button"
          className={`stat-card is-clickable ${subView === "photos" ? "is-active" : ""}`}
          onClick={() => setSubView("photos")}
        >
          <div className="stat-label">
            <Camera size={14} /> Gallery Photos
          </div>
          <div className="stat-value">{photos.length}</div>
          <small className="stat-note">{publishedPhotosCount} shown on homepage</small>
        </button>
        <article className="stat-card">
          <div className="stat-label">
            <CheckCircle2 size={14} /> Published Live
          </div>
          <div className="stat-value">{publishedTotalCount}</div>
          <small className="stat-note">Visible on public site</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <Clock size={14} /> Hidden Items
          </div>
          <div className="stat-value">{hiddenTotalCount}</div>
          <small className="stat-note">Paused from public view</small>
        </article>
      </div>

      <div className="admin-control-bar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search stories or gallery photos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stories or gallery photos…"
          />
        </div>
        <select
          aria-label="Filter stories and gallery section"
          className="admin-control-select"
          value={subView}
          onChange={(e) => setSubView(e.target.value as "stories" | "photos")}
        >
          <option value="stories">Success Stories ({stories.length})</option>
          <option value="photos">Homepage Gallery Photos ({photos.length})</option>
        </select>
        <div className="admin-control-actions">
          <button
            type="button"
            className="admin-action-btn admin-action-btn-secondary admin-toolbar-btn"
            onClick={() => setModalKind("photo")}
          >
            <Camera size={14} /> Upload Photo
          </button>
          <button
            type="button"
            className="admin-action-btn admin-action-btn-primary admin-toolbar-btn"
            onClick={() => setModalKind("story")}
          >
            <Plus size={14} /> Add Story
          </button>
        </div>
      </div>

      {subView === "stories" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Learner</th>
                <th>Focus Area</th>
                <th>Privacy Mode</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">
                    No success stories match your search.
                  </td>
                </tr>
              ) : (
                filteredStories.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.title}</strong>
                    </td>
                    <td>{s.is_anonymous ? "Anonymous Learner" : s.learner_display_name}</td>
                    <td className="whitespace-nowrap">
                      <span className="pill-badge">{s.focus_area}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="pill-badge pill-green">
                        {s.is_anonymous ? "Anonymous" : "Consent Verified"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`pill-badge ${s.is_published ? "pill-green" : ""}`}>
                        {s.is_published ? "Published" : "Hidden"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn-secondary"
                          onClick={() => toggleStoryPublish(s)}
                        >
                          {s.is_published ? "Hide" : "Publish"}
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn-icon admin-action-btn-danger"
                          aria-label={`Delete ${s.title}`}
                          onClick={() => deleteStory(s.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {subView === "photos" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Title</th>
                <th>Category</th>
                <th>Caption</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPhotos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-3">
                      <span>
                        {photos.length === 0
                          ? "No homepage gallery photos yet."
                          : "No homepage gallery photos match your search."}
                      </span>
                      {photos.length === 0 && shouldUseLocalMode() && (
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn-secondary"
                          onClick={() => void restoreDefaultPhotos()}
                        >
                          <RotateCcw size={13} /> Restore Default Photos
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPhotos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="h-10 w-16 rounded object-cover border"
                      />
                    </td>
                    <td>
                      <strong>{p.title}</strong>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="pill-badge">{p.category}</span>
                    </td>
                    <td className="text-xs text-muted-foreground">{p.caption}</td>
                    <td className="whitespace-nowrap">
                      <span className={`pill-badge ${p.is_published ? "pill-green" : ""}`}>
                        {p.is_published ? "Published" : "Hidden"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn-secondary"
                          onClick={() => togglePhotoPublish(p)}
                        >
                          {p.is_published ? "Hide" : "Publish"}
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn-icon admin-action-btn-danger"
                          aria-label={`Delete ${p.title}`}
                          onClick={() => deletePhoto(p.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={modalKind === "story"}
        title="Add Safeguarding-Verified Success Story"
        subtitle="Use Anonymous Learner by default for minors unless guardian consent is verified."
        onClose={() => setModalKind(null)}
      >
        <form onSubmit={addStory}>
          <div className="form-grid">
            <label className="field wide">
              Story title *
              <input
                name="title"
                required
                maxLength={200}
                placeholder="e.g. From hesitant reader to confident speaker"
              />
            </label>
            <label className="field">
              Focus area *
              <select name="focus_area" defaultValue={STORY_FOCUS_AREAS[0]}>
                {STORY_FOCUS_AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Class / Age group
              <input name="class_or_age" maxLength={80} placeholder="e.g. Class 7 learner" />
            </label>
            <label className="field">
              Learner display name
              <input name="learner_display_name" maxLength={120} defaultValue="Anonymous Learner" />
            </label>
            <label className="field">
              Optional photo upload
              <input name="image_file" type="file" accept="image/*" />
            </label>
            <label className="field wide">
              Journey &amp; background *
              <textarea name="story_summary" required maxLength={2000} />
            </label>
            <label className="field wide">
              Support &amp; mentorship provided *
              <textarea name="support_given" required maxLength={1000} />
            </label>
            <label className="field wide">
              Achievement / progress milestone *
              <textarea name="achievement_or_progress" required maxLength={1000} />
            </label>
            <label className="field wide">
              Reflection quote (optional)
              <input name="quote" maxLength={500} />
            </label>
          </div>
          <label className="consent">
            <input type="checkbox" name="is_anonymous" defaultChecked />
            <span>Publish anonymously as “Anonymous Learner” (recommended for minors).</span>
          </label>
          <label className="consent">
            <input type="checkbox" name="guardian_consent_verified" />
            <span>Guardian consent verified for publishing name/photo (if not anonymous).</span>
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalKind(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Award size={14} /> {busy ? "Publishing…" : "Publish Story"}
            </Button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={modalKind === "photo"}
        title="Upload Homepage Teaching Photo"
        subtitle="Only publish photographs with verified parent/guardian and participant consent."
        onClose={() => setModalKind(null)}
      >
        <form onSubmit={addPhoto}>
          <div className="form-grid">
            <label className="field">
              Photo title *
              <input
                name="title"
                required
                maxLength={160}
                placeholder="e.g. Tammana leading English circle"
              />
            </label>
            <label className="field">
              Category *
              <select name="category" defaultValue={PHOTO_CATEGORIES[0]}>
                {PHOTO_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Upload photo
              <input name="photo_file" type="file" accept="image/*" />
            </label>
            <label className="field">
              Or image URL
              <input name="image_url" maxLength={2000} />
            </label>
            <label className="field wide">
              Caption *
              <textarea
                name="caption"
                required
                maxLength={600}
                placeholder="Describe the teaching or community activity shown…"
              />
            </label>
          </div>
          <label className="consent">
            <input type="checkbox" name="consent_verified" required />
            <span>Parent/guardian and participant consent verified.</span>
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalKind(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Camera size={14} /> {busy ? "Uploading…" : "Publish Photo"}
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
