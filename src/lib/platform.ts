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
  if (shouldUseLocalMode()) {
    const db = readLocalDb();
    const localAllocations = db.fund_allocations.filter((a) => a.is_published);
    return {
      summary: calculateFundSummary(db.fund_donations, localAllocations),
      allocations: localAllocations,
    };
  }

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
  if (shouldUseLocalMode()) {
    return readLocalDb().recorded_lectures.filter((l) => l.is_published);
  }
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
  if (shouldUseLocalMode()) {
    return [BASELINE_SUCCESS_STORY, ...readLocalDb().success_stories.filter((s) => s.is_published)];
  }
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
  if (shouldUseLocalMode()) {
    return readLocalDb().activity_photos.filter((p) => p.is_published);
  }
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

export interface LectureQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const LECTURE_QUIZZES: Record<string, LectureQuizQuestion[]> = {
  "lec-1": [
    {
      id: "lec1-q1",
      question: "Which sentence is the clearest polite self-introduction when meeting someone new?",
      options: [
        "Myself Aarav, staying Derabassi.",
        "Hello, my name is Aarav and I am in Class 7 at Derabassi.",
        "Name is Aarav only.",
        "I am coming from school now.",
      ],
      correctIndex: 1,
      explanation:
        "Use 'My name is...' rather than 'Myself...' and speak calmly in complete sentences.",
    },
    {
      id: "lec1-q2",
      question: "When you don't understand a word in English class, what is the best response?",
      options: [
        "Stay silent so nobody notices.",
        "Say 'Excuse me, could you please explain that word again?'",
        "Wait until next week to ask.",
        "Skip the whole chapter.",
      ],
      correctIndex: 1,
      explanation:
        "Asking polite follow-up questions builds speaking confidence and helps other learners too.",
    },
    {
      id: "lec1-q3",
      question: "What daily 10-minute habit helps most with spoken English fluency?",
      options: [
        "Memorizing dictionary pages without speaking",
        "Reading a short paragraph aloud and forming 3 sentences daily",
        "Waiting until grammar is 100% perfect before speaking",
        "Watching without repeating words",
      ],
      correctIndex: 1,
      explanation:
        "Speaking aloud for 10 minutes each day trains pronunciation and natural sentence rhythm.",
    },
  ],
  "lec-2": [
    {
      id: "lec2-q1",
      question: "In the fraction 3/4, what does the denominator (4) represent?",
      options: [
        "How many total equal parts the whole is divided into",
        "The number of leftover parts",
        "The larger number subtracted from 10",
        "How many pages are in a notebook",
      ],
      correctIndex: 0,
      explanation:
        "The bottom number (denominator) tells you how many equal parts make up one whole.",
    },
    {
      id: "lec2-q2",
      question: "Which two fractions show the exact same amount (equivalent fractions)?",
      options: ["1/3 and 2/5", "1/2 and 3/6", "2/3 and 3/4", "1/4 and 1/5"],
      correctIndex: 1,
      explanation:
        "Multiplying both numerator and denominator of 1/2 by 3 gives 3/6, which equals half.",
    },
    {
      id: "lec2-q3",
      question:
        "If 8 notebooks are shared equally among 4 students, what fraction does 1 student get?",
      options: ["1/8", "1/4 of the total set (2 notebooks)", "3/4", "4/1"],
      correctIndex: 1,
      explanation: "One student out of 4 receives 1/4 of the set, which equals 2 notebooks.",
    },
  ],
  "lec-3": [
    {
      id: "lec3-q1",
      question:
        "During the first 30 seconds of a formal interview, what creates the best impression?",
      options: [
        "Looking at the floor and speaking fast",
        "Warm smile, polite greeting, steady eye contact, and clear posture",
        "Using memorised complex words without pausing",
        "Checking your phone messages",
      ],
      correctIndex: 1,
      explanation:
        "Calm body language and a genuine, clear greeting immediately help you connect with the interviewer.",
    },
    {
      id: "lec3-q2",
      question: "How should you answer 'Why do you want this role?' if it is your first job?",
      options: [
        "I don't know, anyone can do it.",
        "Share your willingness to learn, teamwork skills, and reliability.",
        "Say I just want money right away.",
        "Stay quiet until they move on.",
      ],
      correctIndex: 1,
      explanation:
        "Interviewers value honesty, eagerness to learn, punctuality, and respect for customers and teammates.",
    },
    {
      id: "lec3-q3",
      question: "If you miss one part of an interviewer's question, what should you do?",
      options: [
        "Guess randomly without asking.",
        "Politely ask, 'Could you please repeat the last part of the question?'",
        "End the interview.",
        "Change the topic completely.",
      ],
      correctIndex: 1,
      explanation:
        "Asking politely to clarify shows active listening and honesty rather than nervousness.",
    },
  ],
};

const SUBJECT_QUIZ_FALLBACKS: Record<string, LectureQuizQuestion[]> = {
  English: LECTURE_QUIZZES["lec-1"]!,
  Mathematics: LECTURE_QUIZZES["lec-2"]!,
  "Career readiness": LECTURE_QUIZZES["lec-3"]!,
  Science: [
    {
      id: "sci-q1",
      question: "What is the best way to understand a Science diagram for school exams?",
      options: [
        "Trace the labels and explain what each part does in one short sentence",
        "Skip diagrams and read only the chapter title",
        "Color it without reading labels",
        "Copy it once and never revise",
      ],
      correctIndex: 0,
      explanation: "Linking each label to its function builds both memory and conceptual clarity.",
    },
    {
      id: "sci-q2",
      question: "Why should observations in an experiment be written immediately?",
      options: [
        "So we remember exact measurements cleanly without guessing later",
        "Because pens run out quickly",
        "To fill extra pages",
        "To hide mistakes",
      ],
      correctIndex: 0,
      explanation: "Recording what you actually observe is the foundation of scientific thinking.",
    },
    {
      id: "sci-q3",
      question: "When solving Science numericals, which habit prevents easy mistakes?",
      options: [
        "Writing the formula and correct units first (e.g., m/s, kg, °C)",
        "Dropping units at every step",
        "Guessing the final number before reading the values",
        "Skipping intermediate steps",
      ],
      correctIndex: 0,
      explanation:
        "Keeping formulas and units visible checks whether your answer makes physical sense.",
    },
  ],
  "Digital literacy": [
    {
      id: "dig-q1",
      question: "Which password habit keeps a student email or learning account safest?",
      options: [
        "Using your own first name everywhere",
        "A unique combination of words/numbers never shared with strangers",
        "123456 so it is easy to type",
        "Posting your password in a public group",
      ],
      correctIndex: 1,
      explanation:
        "Never share account passwords or OTP codes with anyone online or over unknown calls.",
    },
    {
      id: "dig-q2",
      question: "Before believing or forwarding a message online, what should you check?",
      options: [
        "Whether it came from an official educational source or verified teacher",
        "How many colorful emojis it has",
        "Only whether someone said 'urgent'",
        "Forward it immediately without reading",
      ],
      correctIndex: 0,
      explanation: "Checking trusted sources protects students and families from misinformation.",
    },
    {
      id: "dig-q3",
      question: "What makes a formal email subject line clear and helpful?",
      options: [
        "Leave the subject line completely blank",
        "Write a short phrase like 'Class 7 English Homework Doubt - Aarav'",
        "Type only 'Hello' in all caps",
        "Write the entire paragraph inside the subject box",
      ],
      correctIndex: 1,
      explanation: "A concise subject line with topic and name helps your mentor reply faster.",
    },
  ],
};

export function getQuizForLecture(
  lecture: Pick<RecordedLectureRow, "id" | "subject">,
): LectureQuizQuestion[] {
  return (
    LECTURE_QUIZZES[lecture.id] ??
    SUBJECT_QUIZ_FALLBACKS[lecture.subject] ??
    LECTURE_QUIZZES["lec-1"]!
  );
}
