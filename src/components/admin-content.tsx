import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Award, Camera, ExternalLink, IndianRupee, Receipt, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { makeLocalId, shouldUseLocalMode, updateLocalDb } from "@/lib/local-store";
import {
  calculateFundSummary,
  CLASS_LEVELS,
  extractYouTubeId,
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
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className="space-y-8">
      <form className="form-panel" onSubmit={addLecture}>
        <div className="eyebrow">
          <Video size={13} /> Recorded lectures
        </div>
        <h2>Upload or link a recorded lecture</h2>
        <div className="form-grid">
          <label className="field wide">
            Lecture title *
            <input name="title" required maxLength={200} placeholder="e.g. Spoken English Part 1" />
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
            <textarea name="description" maxLength={1500} placeholder="What students will learn…" />
          </label>
        </div>
        <Button type="submit" className="mt-5" disabled={uploading}>
          {uploading ? "Uploading lecture…" : "Publish recorded lecture"}
        </Button>
      </form>

      <div>
        <h2>All recorded lectures ({lectures.length})</h2>
        {lectures.length === 0 ? (
          <div className="empty-state mt-4">No recorded lectures uploaded yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {lectures.map((l) => (
              <div key={l.id} className="ledger-row">
                <div className="ledger-main">
                  <div className="ledger-badges">
                    <span className="pill-badge pill-green">{l.subject}</span>
                    <span className="pill-badge">{l.topic}</span>
                    <span className="pill-badge">{l.is_published ? "Published" : "Hidden"}</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold">{l.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {l.instructor_name} ·{" "}
                    {l.class_level === "All" ? "All classes" : `Class ${l.class_level}`}
                    {l.duration ? ` · ${l.duration}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => togglePublish(l)}>
                    {l.is_published ? "Hide" : "Publish"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeLecture(l.id)}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
  const [busy, setBusy] = useState(false);
  const summary = calculateFundSummary(donations, allocations);

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
    onStatus(
      "Contribution recorded securely. Private donor details remain hidden from public pages.",
    );
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
      onStatus("Fund allocation/expenditure published with supporting proof.");
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
      await logAudit(
        "DELETE",
        "fund_allocations",
        item.id,
        `Deleted ${item.entry_type}: ${item.title}`,
      );
      onStatus("Fund entry deleted.");
    } else {
      const { error } = await supabase.from("fund_allocations").delete().eq("id", item.id);
      if (!error) {
        await logAudit(
          "DELETE",
          "fund_allocations",
          item.id,
          `Deleted ${item.entry_type}: ${item.title}`,
        );
      }
      onStatus(error ? error.message : "Fund entry deleted.", Boolean(error));
    }
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["public-funds"] });
    qc.invalidateQueries({ queryKey: ["home-funds-summary"] });
  }

  return (
    <div className="space-y-10">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Received</div>
          <div className="stat-value">{formatINR(summary.totalReceivedInr)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spent</div>
          <div className="stat-value">{formatINR(summary.totalSpentInr)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Available</div>
          <div className="stat-value">{formatINR(summary.availableBalanceInr)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Planned</div>
          <div className="stat-value">{formatINR(summary.totalPlannedInr)}</div>
        </div>
      </div>

      <form className="form-panel" onSubmit={addDonation}>
        <div className="eyebrow">
          <IndianRupee size={13} /> Funds received (Donor details kept private)
        </div>
        <h2>Record received contribution</h2>
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
            Payment reference / UPI / Bank ID (private)
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
          <span>
            Show public label &amp; amount on the Fund Transparency page (never shows email/phone).
          </span>
        </label>
        <Button type="submit">Save received fund entry</Button>
      </form>

      <form className="form-panel" onSubmit={addAllocation}>
        <div className="eyebrow">
          <Receipt size={13} /> Allocations, bills &amp; receipts
        </div>
        <h2>Record expenditure or planned allocation + upload proof</h2>
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
            <input
              name="proof_caption"
              maxLength={300}
              placeholder="Brief note about the bill or photo"
            />
          </label>
          <label className="field wide">
            Description of utilisation
            <textarea name="description" maxLength={1500} />
          </label>
        </div>
        <Button type="submit" className="mt-5" disabled={busy}>
          {busy ? "Uploading proof…" : "Publish allocation / expenditure"}
        </Button>
      </form>

      <div>
        <h2>Published Fund Entries ({allocations.length})</h2>
        <div className="mt-4 grid gap-3">
          {allocations.map((a) => (
            <div key={a.id} className="ledger-row">
              <div>
                <div className="ledger-badges">
                  <span className="pill-badge pill-green">{a.entry_type}</span>
                  <span className="pill-badge">{a.category}</span>
                </div>
                <strong className="block mt-2">{a.title}</strong>
                <p className="text-xs text-muted-foreground">
                  {a.entry_date} · {formatINR(Number(a.amount_inr))}
                  {a.proof_url && (
                    <>
                      {" "}
                      ·{" "}
                      <a href={a.proof_url} target="_blank" rel="noreferrer" className="underline">
                        View proof <ExternalLink size={11} className="inline" />
                      </a>
                    </>
                  )}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => deleteAllocation(a)}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          ))}
        </div>
      </div>

      {auditLogs.length > 0 && (
        <div>
          <h2>Fund Audit Trail ({auditLogs.length})</h2>
          <div className="mt-3 grid gap-2">
            {auditLogs.slice(0, 15).map((log) => (
              <div key={log.id} className="text-xs text-muted-foreground border rounded p-3">
                <strong>{new Date(log.created_at).toLocaleString("en-IN")}</strong> · {log.action} ·{" "}
                {log.summary}
              </div>
            ))}
          </div>
        </div>
      )}
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
      onStatus("Activity photo added to homepage gallery.");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["home-activity-photos"] });
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Photo upload failed.", true);
    } finally {
      setBusy(false);
    }
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

  return (
    <div className="space-y-10">
      <form className="form-panel" onSubmit={addStory}>
        <div className="eyebrow">
          <Award size={13} /> Success stories
        </div>
        <h2>Publish a safeguarding-compliant success story</h2>
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
            Learner display name (ignored if anonymous)
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
          <span>
            Guardian consent verified for publishing name/photo (required if non-anonymous).
          </span>
        </label>
        <Button type="submit" disabled={busy}>
          Publish success story
        </Button>
      </form>

      <form className="form-panel" onSubmit={addPhoto}>
        <div className="eyebrow">
          <Camera size={13} /> Homepage teaching &amp; mentor photos
        </div>
        <h2>Upload real teaching, mentor &amp; activity photos</h2>
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
          <span>
            Parent/guardian and participant consent verified for publishing this photograph.
          </span>
        </label>
        <Button type="submit" disabled={busy}>
          Publish to homepage gallery
        </Button>
      </form>

      <div className="grid gap-6">
        <div>
          <h2>Published Stories ({stories.length})</h2>
          <div className="mt-3 grid gap-3">
            {stories.map((s) => (
              <div key={s.id} className="ledger-row">
                <div>
                  <strong>{s.title}</strong> (
                  {s.is_anonymous ? "Anonymous" : s.learner_display_name})
                  <p className="text-xs text-muted-foreground">{s.focus_area}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteStory(s.id)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2>Homepage Gallery Photos ({photos.length})</h2>
          <div className="mt-3 grid gap-3">
            {photos.map((p) => (
              <div key={p.id} className="ledger-row">
                <div>
                  <strong>{p.title}</strong> · <span className="pill-badge">{p.category}</span>
                  <p className="text-xs text-muted-foreground mt-1">{p.caption}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deletePhoto(p.id)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
