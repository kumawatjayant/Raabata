import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isLocalDevHost, readLocalDb, shouldUseLocalMode } from "./local-store";

export const FUND_CATEGORIES = [
  "Learning Materials & Books",
  "Digital & Computer Education",
  "Community Food Drives",
  "Classroom & Study Space",
  "Career & Skill Workshops",
  "Other Community Support",
] as const;

export type FundCategory = (typeof FUND_CATEGORIES)[number];

export const LECTURE_SUBJECTS = [
  "English",
  "Science",
  "Mathematics",
  "Digital literacy",
  "Career readiness",
  "Life skills",
] as const;

export const CLASS_LEVELS = ["All", "1–3", "4–5", "6–8", "9–10", "11–12", "Young adult"] as const;

export const STORY_FOCUS_AREAS = [
  "Academic growth",
  "Spoken English & Confidence",
  "Career & Interview Readiness",
] as const;

export const PHOTO_CATEGORIES = [
  "Founder Teaching",
  "Mentor Session",
  "Community Activity",
  "Classroom Learning",
] as const;

export type MentorProfileRow = Database["public"]["Tables"]["mentor_profiles"]["Row"];
export type StudentRecordRow = Database["public"]["Tables"]["student_records"]["Row"];
export type AssignmentRow = Database["public"]["Tables"]["mentor_student_assignments"]["Row"];
export type ProgressLogRow = Database["public"]["Tables"]["student_progress_logs"]["Row"];
export type RecordedLectureRow = Database["public"]["Tables"]["recorded_lectures"]["Row"];
export type FundDonationRow = Database["public"]["Tables"]["fund_donations"]["Row"];
export type FundAllocationRow = Database["public"]["Tables"]["fund_allocations"]["Row"];
export type FundAuditLogRow = Database["public"]["Tables"]["fund_audit_logs"]["Row"];
export type SuccessStoryRow = Database["public"]["Tables"]["success_stories"]["Row"];
export type ActivityPhotoRow = Database["public"]["Tables"]["activity_photos"]["Row"];

export interface AcknowledgedDonation {
  id: string;
  received_date: string;
  amount_inr: number;
  public_label: string;
  purpose: string;
}

export interface CategoryBreakdown {
  category: FundCategory;
  plannedInr: number;
  spentInr: number;
  sharePercent: number;
}

export interface FundSummary {
  totalReceivedInr: number;
  totalSpentInr: number;
  totalPlannedInr: number;
  availableBalanceInr: number;
  donationCount: number;
  expenditureCount: number;
  acknowledgedDonations: AcknowledgedDonation[];
  categoryBreakdown: CategoryBreakdown[];
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      const candidate = parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
      return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
    }
    if (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtube-nocookie.com")
    ) {
      const v = parsed.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live");
      if (
        embedIdx >= 0 &&
        parts[embedIdx + 1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIdx + 1]!)
      ) {
        return parts[embedIdx + 1]!;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function calculateFundSummary(
  donations: Array<
    Pick<
      FundDonationRow,
      | "amount_inr"
      | "is_public_acknowledgement"
      | "id"
      | "received_date"
      | "public_label"
      | "purpose"
    >
  >,
  allocations: Array<
    Pick<FundAllocationRow, "amount_inr" | "entry_type" | "category" | "is_published">
  >,
  totalReceivedOverride?: number,
): FundSummary {
  const publishedAllocations = allocations.filter((a) => a.is_published);
  const totalReceivedInr =
    typeof totalReceivedOverride === "number"
      ? Math.max(0, totalReceivedOverride)
      : donations.reduce((sum, d) => sum + Number(d.amount_inr || 0), 0);

  const totalSpentInr = publishedAllocations
    .filter((a) => a.entry_type === "expenditure")
    .reduce((sum, a) => sum + Number(a.amount_inr || 0), 0);

  const totalPlannedInr = publishedAllocations
    .filter((a) => a.entry_type === "planned_allocation")
    .reduce((sum, a) => sum + Number(a.amount_inr || 0), 0);

  const availableBalanceInr = totalReceivedInr - totalSpentInr;

  const categoryBreakdown: CategoryBreakdown[] = FUND_CATEGORIES.map((category) => {
    const items = publishedAllocations.filter((a) => a.category === category);
    const plannedInr = items
      .filter((a) => a.entry_type === "planned_allocation")
      .reduce((sum, a) => sum + Number(a.amount_inr || 0), 0);
    const spentInr = items
      .filter((a) => a.entry_type === "expenditure")
      .reduce((sum, a) => sum + Number(a.amount_inr || 0), 0);
    const sharePercent = totalSpentInr > 0 ? Math.round((spentInr / totalSpentInr) * 100) : 0;
    return { category, plannedInr, spentInr, sharePercent };
  });

  const acknowledgedDonations: AcknowledgedDonation[] = donations
    .filter((d) => d.is_public_acknowledgement)
    .map((d) => ({
      id: d.id,
      received_date: d.received_date,
      amount_inr: Number(d.amount_inr || 0),
      public_label: d.public_label,
      purpose: d.purpose,
    }));

  return {
    totalReceivedInr,
    totalSpentInr,
    totalPlannedInr,
    availableBalanceInr,
    donationCount: donations.length,
    expenditureCount: publishedAllocations.filter((a) => a.entry_type === "expenditure").length,
    acknowledgedDonations,
    categoryBreakdown,
  };
}

export async function fetchPublicFundData(): Promise<{
  summary: FundSummary;
  allocations: FundAllocationRow[];
}> {
  const [summaryRes, allocationsRes] = await Promise.all([
    supabase.rpc("get_public_fund_summary"),
    supabase
      .from("fund_allocations")
      .select("*")
      .eq("is_published", true)
      .order("entry_date", { ascending: false }),
  ]);

  if (shouldUseLocalMode(allocationsRes.error ?? summaryRes.error)) {
    const db = readLocalDb();
    const localAllocations = db.fund_allocations.filter((a) => a.is_published);
    return {
      summary: calculateFundSummary(db.fund_donations, localAllocations),
      allocations: localAllocations,
    };
  }

  const allocations = (
    !allocationsRes.error && allocationsRes.data ? allocationsRes.data : []
  ) as FundAllocationRow[];
  const raw =
    !summaryRes.error &&
    summaryRes.data &&
    typeof summaryRes.data === "object" &&
    !Array.isArray(summaryRes.data)
      ? (summaryRes.data as Record<string, unknown>)
      : null;

  const totalReceivedInr = raw ? Number(raw["total_received_inr"] ?? 0) : 0;
  const donationCount = raw ? Number(raw["donation_count"] ?? 0) : 0;
  const acknowledgedRaw =
    raw && Array.isArray(raw["acknowledged_donations"]) ? raw["acknowledged_donations"] : [];
  const acknowledgedDonations: AcknowledgedDonation[] = acknowledgedRaw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: String(item["id"] ?? ""),
      received_date: String(item["received_date"] ?? ""),
      amount_inr: Number(item["amount_inr"] ?? 0),
      public_label: String(item["public_label"] ?? "Community Supporter"),
      purpose: String(item["purpose"] ?? "General Education & Community Fund"),
    }));

  const computed = calculateFundSummary([], allocations, totalReceivedInr);
  return {
    summary: {
      ...computed,
      donationCount,
      acknowledgedDonations,
    },
    allocations,
  };
}

export async function fetchPublishedLectures(): Promise<RecordedLectureRow[]> {
  const { data, error } = await supabase
    .from("recorded_lectures")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (shouldUseLocalMode(error)) {
    return readLocalDb().recorded_lectures.filter((l) => l.is_published);
  }
  if (error || !data) return [];
  return data;
}

export const BASELINE_SUCCESS_STORY: SuccessStoryRow = {
  id: "baseline-starbucks-interview",
  learner_display_name: "Anonymous Learner",
  class_or_age: "Young Adult Learner",
  focus_area: "Career & Interview Readiness",
  title: "Preparing for a first formal interview with confidence",
  story_summary:
    "Documented in Rabata’s organization profile: a young learner in Derabassi received individualized mentorship to prepare for an interview opportunity at Starbucks.",
  support_given:
    "One-on-one spoken English practice, mock interview coaching, workplace etiquette, and personal encouragement from Tammana Rathore.",
  achievement_or_progress:
    "Developed the communication clarity and confidence needed to step into a formal corporate interview process for the first time. (Reported as interview preparation; no unverified placement claim is published.)",
  quote:
    "Education at Rabata goes beyond textbooks — it helps young learners believe they belong in rooms they once thought were closed to them.",
  image_url: null,
  is_anonymous: true,
  guardian_consent_verified: false,
  is_published: true,
  created_by: null,
  created_at: "2026-11-15T00:00:00Z",
};

export async function fetchPublishedStories(): Promise<SuccessStoryRow[]> {
  const { data, error } = await supabase
    .from("success_stories")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (shouldUseLocalMode(error)) {
    return [BASELINE_SUCCESS_STORY, ...readLocalDb().success_stories.filter((s) => s.is_published)];
  }
  const dbStories = !error && data ? data : [];
  return [BASELINE_SUCCESS_STORY, ...dbStories];
}

export async function fetchPublishedActivityPhotos(): Promise<ActivityPhotoRow[]> {
  const { data, error } = await supabase
    .from("activity_photos")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (shouldUseLocalMode(error)) {
    return readLocalDb().activity_photos.filter((p) => p.is_published);
  }
  if (error || !data) return [];
  return data;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadPlatformFile(
  bucket: "fund-proofs" | "lecture-media" | "community-media",
  file: File,
  folder = "uploads",
): Promise<{ url: string; warning?: string }> {
  const maxBytes = bucket === "lecture-media" ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      bucket === "lecture-media"
        ? "Video file exceeds 50 MB limit. For larger videos, paste a YouTube or direct video link."
        : "File exceeds 8 MB limit. Please upload a smaller image or PDF.",
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}-${safeName}`;

  if (!shouldUseLocalMode()) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) return { url: data.publicUrl };
    }
  }

  if (isLocalDevHost()) {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error(
        "In local preview mode, uploaded files are stored in browser storage (max 2 MB). Paste a URL for larger videos or apply the Supabase Storage migration.",
      );
    }
    const url = await readFileAsDataUrl(file);
    return { url, warning: "Saved locally for localhost preview." };
  }

  throw new Error("File upload failed. Please paste a valid URL or try again.");
}
