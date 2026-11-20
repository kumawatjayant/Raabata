import type { RoleRow } from "./access";
import type {
  ActivityPhotoRow,
  AssignmentRow,
  FundAllocationRow,
  FundAuditLogRow,
  FundDonationRow,
  MentorProfileRow,
  ProgressLogRow,
  RecordedLectureRow,
  StudentRecordRow,
  SuccessStoryRow,
} from "./platform";

export type LocalDevRoleKey = "admin" | "mentor1" | "mentor2" | "student";

export interface LocalDevSession {
  key: LocalDevRoleKey;
  userId: string;
  email: string;
  displayName: string;
  role: "admin" | "mentor" | "student";
}

export const LOCAL_DEV_ACCOUNTS: Record<LocalDevRoleKey, LocalDevSession> = {
  admin: {
    key: "admin",
    userId: "local-admin-1",
    email: "rabataofficial111@gmail.com",
    displayName: "Tammana Rathore (Admin)",
    role: "admin",
  },
  mentor1: {
    key: "mentor1",
    userId: "local-mentor-1",
    email: "mentor1@rabata.local",
    displayName: "Ananya Sharma (Mentor 1)",
    role: "mentor",
  },
  mentor2: {
    key: "mentor2",
    userId: "local-mentor-2",
    email: "mentor2@rabata.local",
    displayName: "Rohan Verma (Mentor 2)",
    role: "mentor",
  },
  student: {
    key: "student",
    userId: "local-student-1",
    email: "student@rabata.local",
    displayName: "Aarav (Student)",
    role: "student",
  },
};

const SESSION_KEY = "rabata_local_dev_session_v1";
const DB_KEY = "rabata_local_db_v3";
const ENQUIRIES_KEY = "rabata_local_enquiries_v1";

export interface LocalEnquiryItem {
  id: string;
  created_at: string;
  kind: "contact" | "student" | "volunteer";
  name: string;
  email: string;
  details: Record<string, string>;
  consent: boolean;
}

export interface LocalDatabaseState {
  app_profiles: Array<{
    user_id: string;
    display_name: string;
    phone: string | null;
    location: string | null;
  }>;
  user_roles: RoleRow[];
  mentor_profiles: MentorProfileRow[];
  student_records: StudentRecordRow[];
  mentor_student_assignments: AssignmentRow[];
  student_progress_logs: ProgressLogRow[];
  recorded_lectures: RecordedLectureRow[];
  fund_donations: FundDonationRow[];
  fund_allocations: FundAllocationRow[];
  fund_audit_logs: FundAuditLogRow[];
  success_stories: SuccessStoryRow[];
  activity_photos: ActivityPhotoRow[];
}

function defaultDatabaseState(): LocalDatabaseState {
  const now = "2026-11-18T10:00:00.000Z";
  return {
    app_profiles: [
      {
        user_id: LOCAL_DEV_ACCOUNTS.admin.userId,
        display_name: LOCAL_DEV_ACCOUNTS.admin.displayName,
        phone: null,
        location: "Derabassi, Punjab, India",
      },
      {
        user_id: LOCAL_DEV_ACCOUNTS.mentor1.userId,
        display_name: LOCAL_DEV_ACCOUNTS.mentor1.displayName,
        phone: null,
        location: "Derabassi, Punjab",
      },
      {
        user_id: LOCAL_DEV_ACCOUNTS.mentor2.userId,
        display_name: LOCAL_DEV_ACCOUNTS.mentor2.displayName,
        phone: null,
        location: "Chandigarh",
      },
      {
        user_id: LOCAL_DEV_ACCOUNTS.student.userId,
        display_name: LOCAL_DEV_ACCOUNTS.student.displayName,
        phone: null,
        location: "Derabassi, Punjab",
      },
    ],
    user_roles: [
      {
        id: "role-admin-1",
        user_id: LOCAL_DEV_ACCOUNTS.admin.userId,
        role: "admin",
        status: "active",
        requested_at: now,
      },
      {
        id: "role-mentor-1",
        user_id: LOCAL_DEV_ACCOUNTS.mentor1.userId,
        role: "mentor",
        status: "active",
        requested_at: now,
      },
      {
        id: "role-mentor-2",
        user_id: LOCAL_DEV_ACCOUNTS.mentor2.userId,
        role: "mentor",
        status: "active",
        requested_at: now,
      },
      {
        id: "role-student-1",
        user_id: LOCAL_DEV_ACCOUNTS.student.userId,
        role: "student",
        status: "active",
        requested_at: now,
      },
    ],
    mentor_profiles: [
      {
        user_id: LOCAL_DEV_ACCOUNTS.mentor1.userId,
        full_name: "Ananya Sharma",
        email: "mentor1@rabata.local",
        phone: "+91-98765-00101",
        location: "Derabassi, Punjab",
        qualifications: "M.A. English, B.Ed.",
        subjects: "Spoken English, Reading & Grammar",
        class_levels: "Classes 4–10",
        languages: "Hindi, English, Punjabi",
        availability: "Mon, Wed, Sat (4 PM – 6 PM)",
        experience: "3 years community English teaching",
        bio: "Passionate about helping first-generation learners speak English confidently.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        user_id: LOCAL_DEV_ACCOUNTS.mentor2.userId,
        full_name: "Rohan Verma",
        email: "mentor2@rabata.local",
        phone: "+91-98765-00202",
        location: "Chandigarh / Online",
        qualifications: "B.Tech Computer Science",
        subjects: "Digital Literacy, Science, Mathematics",
        class_levels: "Classes 6–12",
        languages: "Hindi, English",
        availability: "Tue, Thu, Sun (5 PM – 7 PM)",
        experience: "2 years STEM & computer basics mentoring",
        bio: "Focuses on practical science, foundational math, and computer skills.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    student_records: [
      {
        id: "stu-aarav-1",
        student_user_id: LOCAL_DEV_ACCOUNTS.student.userId,
        first_name: "Aarav",
        guardian_name: "Sunita Devi",
        guardian_email: "guardian.aarav@example.com",
        guardian_phone: "+91-98000-11101",
        class_level: "6–8",
        subjects_needed: "Spoken English, Reading Comprehension",
        preferred_language: "Hindi and English",
        preferred_format: "In person",
        learning_goals: "Build fluency in everyday English conversation and paragraph writing.",
        attendance_count: 11,
        total_sessions: 12,
        progress_summary: "Reading confidence improved noticeably; now leading group warm-ups.",
        status: "active",
        guardian_consent: true,
        created_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
        updated_at: now,
      },
      {
        id: "stu-meera-2",
        student_user_id: null,
        first_name: "Meera",
        guardian_name: "Rajesh Kumar",
        guardian_email: "guardian.meera@example.com",
        guardian_phone: "+91-98000-11102",
        class_level: "9–10",
        subjects_needed: "English Grammar, Interview Readiness",
        preferred_language: "Hindi and English",
        preferred_format: "In person",
        learning_goals: "Prepare for Class 10 board English essays and communication.",
        attendance_count: 9,
        total_sessions: 10,
        progress_summary: "Completed tense mastery exercises and structured comprehension drills.",
        status: "active",
        guardian_consent: true,
        created_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
        updated_at: now,
      },
      {
        id: "stu-kabir-3",
        student_user_id: null,
        first_name: "Kabir",
        guardian_name: "Gurpreet Kaur",
        guardian_email: "guardian.kabir@example.com",
        guardian_phone: "+91-98000-11103",
        class_level: "9–10",
        subjects_needed: "Science, Digital Literacy",
        preferred_language: "Punjabi",
        preferred_format: "Online",
        learning_goals: "Understand states of matter, email basics, and typing.",
        attendance_count: 8,
        total_sessions: 9,
        progress_summary: "Created first digital document and completed Science Chapter 1 quiz.",
        status: "active",
        guardian_consent: true,
        created_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
        updated_at: now,
      },
    ],
    mentor_student_assignments: [
      {
        id: "asgn-1",
        mentor_user_id: LOCAL_DEV_ACCOUNTS.mentor1.userId,
        student_id: "stu-aarav-1",
        subjects: "Spoken English & Reading",
        schedule_notes: "Mon & Wed 4:30 PM",
        active: true,
        assigned_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        assigned_at: now,
      },
      {
        id: "asgn-2",
        mentor_user_id: LOCAL_DEV_ACCOUNTS.mentor1.userId,
        student_id: "stu-meera-2",
        subjects: "English Grammar & Writing",
        schedule_notes: "Sat 4:00 PM",
        active: true,
        assigned_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        assigned_at: now,
      },
      {
        id: "asgn-3",
        mentor_user_id: LOCAL_DEV_ACCOUNTS.mentor2.userId,
        student_id: "stu-kabir-3",
        subjects: "Science & Digital Literacy",
        schedule_notes: "Tue & Thu 5:30 PM",
        active: true,
        assigned_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        assigned_at: now,
      },
    ],
    student_progress_logs: [
      {
        id: "log-1",
        student_id: "stu-aarav-1",
        mentor_user_id: LOCAL_DEV_ACCOUNTS.mentor1.userId,
        session_date: "2026-11-16",
        topic_covered: "Everyday Introductions & Asking Questions",
        attendance_status: "present",
        remarks: "Spoke three full sentences without hesitation.",
        created_at: now,
      },
      {
        id: "log-2",
        student_id: "stu-meera-2",
        mentor_user_id: LOCAL_DEV_ACCOUNTS.mentor1.userId,
        session_date: "2026-11-15",
        topic_covered: "Essay Structure & Active Voice",
        attendance_status: "present",
        remarks: "Strong vocabulary progress; keep practising connectors.",
        created_at: now,
      },
      {
        id: "log-3",
        student_id: "stu-kabir-3",
        mentor_user_id: LOCAL_DEV_ACCOUNTS.mentor2.userId,
        session_date: "2026-11-17",
        topic_covered: "Introduction to Spreadsheets & Online Safety",
        attendance_status: "present",
        remarks: "Completed typing exercise accurately.",
        created_at: now,
      },
    ],
    recorded_lectures: [
      {
        id: "lec-1",
        title: "Spoken English Foundations: Everyday Confidence",
        description:
          "Practical session covering daily greetings, sentence framing, and building confidence while speaking.",
        subject: "English",
        class_level: "All",
        topic: "Daily Conversations",
        video_url: "https://www.youtube.com/watch?v=O-6q-siuMik",
        youtube_id: "O-6q-siuMik",
        thumbnail_url: null,
        duration: "14 mins",
        instructor_name: "Tammana Rathore",
        is_published: true,
        created_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
      },
      {
        id: "lec-2",
        title: "Understanding Fractions Visually (Middle School)",
        description:
          "Clear step-by-step lesson on fractions, numerator/denominator intuition, and everyday examples.",
        subject: "Mathematics",
        class_level: "6–8",
        topic: "Fractions & Number Sense",
        video_url: "https://www.youtube.com/watch?v=n0FZhQ_GkKw",
        youtube_id: "n0FZhQ_GkKw",
        thumbnail_url: null,
        duration: "11 mins",
        instructor_name: "Rohan Verma",
        is_published: true,
        created_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
      },
      {
        id: "lec-3",
        title: "Interview Preparation & First Impressions",
        description:
          "How young learners can introduce themselves calmly, dress neatly, and answer common interview questions.",
        subject: "Career readiness",
        class_level: "Young adult",
        topic: "Interview Skills",
        video_url: "https://www.youtube.com/watch?v=HG68Ymazo18",
        youtube_id: "HG68Ymazo18",
        thumbnail_url: null,
        duration: "16 mins",
        instructor_name: "Tammana Rathore",
        is_published: true,
        created_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
      },
    ],
    fund_donations: [
      {
        id: "don-1",
        received_date: "2026-11-05",
        amount_inr: 12000,
        donor_name: "Private Supporter (Example Demo)",
        donor_email: "private@example.com",
        donor_phone: null,
        purpose: "Books, Notebooks & Stationery",
        payment_reference: "DEMO-TXN-101",
        is_public_acknowledgement: true,
        public_label: "Derabassi Community Well-Wisher",
        notes: "Showcase sample ledger entry",
        recorded_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
      },
      {
        id: "don-2",
        received_date: "2026-11-12",
        amount_inr: 8000,
        donor_name: "Anonymous Educator",
        donor_email: null,
        donor_phone: null,
        purpose: "Community Food Drive & Digital Learning",
        payment_reference: "DEMO-TXN-102",
        is_public_acknowledgement: true,
        public_label: "Anonymous Friend of Rabata",
        notes: "Showcase sample ledger entry",
        recorded_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
      },
    ],
    fund_allocations: [
      {
        id: "alloc-1",
        entry_date: "2026-11-08",
        entry_type: "expenditure",
        category: "Learning Materials & Books",
        title: "NCERT Workbooks, Notebooks & Stationery Pack (15 Students)",
        description:
          "Purchased English workbooks, ruled notebooks, pens, and geometry kits for active Rabata learners.",
        amount_inr: 4800,
        vendor_or_beneficiary: "Derabassi Book Depot",
        proof_url: "/images/rabata-classroom.jpeg",
        proof_type: "photograph",
        proof_caption: "Students using distributed learning notebooks during class session",
        is_published: true,
        recorded_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
        updated_at: now,
      },
      {
        id: "alloc-2",
        entry_date: "2026-11-14",
        entry_type: "expenditure",
        category: "Community Food Drives",
        title: "Community Fresh Meal Drive Provisions",
        description:
          "Ingredients and meal packaging for home-cooked meals served to children after weekend sessions.",
        amount_inr: 3700,
        vendor_or_beneficiary: "Local Grocery & Community Kitchen",
        proof_url: "/images/food-drive.jpeg",
        proof_type: "photograph",
        proof_caption: "Rabata food donation drive update",
        is_published: true,
        recorded_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
        updated_at: now,
      },
      {
        id: "alloc-3",
        entry_date: "2026-11-18",
        entry_type: "planned_allocation",
        category: "Digital & Computer Education",
        title: "Second-Hand Study Laptop & Digital Literacy Kit",
        description:
          "Planned allocation reserved to provide shared laptop access for computer basics and spoken English video lessons.",
        amount_inr: 6500,
        vendor_or_beneficiary: "Planned Classroom Equipment",
        proof_url: null,
        proof_type: null,
        proof_caption: null,
        is_published: true,
        recorded_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
        updated_at: now,
      },
    ],
    fund_audit_logs: [
      {
        id: "aud-1",
        action: "CREATE",
        table_name: "fund_allocations",
        record_id: "alloc-1",
        summary: "Recorded expenditure: NCERT Workbooks & Stationery Pack (₹4,800)",
        actor_user_id: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
      },
      {
        id: "aud-2",
        action: "CREATE",
        table_name: "fund_allocations",
        record_id: "alloc-2",
        summary: "Recorded expenditure: Community Fresh Meal Drive Provisions (₹3,700)",
        actor_user_id: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
      },
    ],
    success_stories: [
      {
        id: "sty-2",
        learner_display_name: "Anonymous Learner",
        class_or_age: "Class 8 learner",
        focus_area: "Spoken English & Confidence",
        title: "Finding a voice in morning reading circles",
        story_summary:
          "Joined Rabata hesitant to read English aloud in front of peers, struggling with basic sentence structure.",
        support_given:
          "Weekly one-on-one phonics practice, bilingual Hindi-English worksheets, and encouragement from mentor Ananya.",
        achievement_or_progress:
          "Now reads full passages fluently during group sessions and helps younger Class 4 learners with vocabulary.",
        quote: "I used to stay quiet in class. Now I raise my hand first.",
        image_url: null,
        is_anonymous: true,
        guardian_consent_verified: false,
        is_published: true,
        created_by: LOCAL_DEV_ACCOUNTS.admin.userId,
        created_at: now,
      },
    ],
    activity_photos: [],
  };
}

export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.endsWith(".ngrok-free.app") ||
    host.endsWith(".ngrok-free.dev") ||
    host.endsWith(".ngrok.io") ||
    host.endsWith(".lhr.life") ||
    host.endsWith(".localhost.run") ||
    host.endsWith(".trycloudflare.com") ||
    host.endsWith(".vercel.app")
  );
}

export function getLocalDevSession(): LocalDevSession | null {
  if (!isLocalDevHost()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalDevSession>;
    if (parsed.key && parsed.key in LOCAL_DEV_ACCOUNTS) {
      return LOCAL_DEV_ACCOUNTS[parsed.key];
    }
    return null;
  } catch {
    return null;
  }
}

export function setLocalDevSession(key: LocalDevRoleKey | null): LocalDevSession | null {
  if (!isLocalDevHost()) return null;
  if (!key) {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const account = LOCAL_DEV_ACCOUNTS[key];
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  return account;
}

export function readLocalDb(): LocalDatabaseState {
  const base = defaultDatabaseState();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<LocalDatabaseState>;
    return {
      app_profiles: parsed.app_profiles ?? base.app_profiles,
      user_roles: parsed.user_roles ?? base.user_roles,
      mentor_profiles: parsed.mentor_profiles ?? base.mentor_profiles,
      student_records: parsed.student_records ?? base.student_records,
      mentor_student_assignments:
        parsed.mentor_student_assignments ?? base.mentor_student_assignments,
      student_progress_logs: parsed.student_progress_logs ?? base.student_progress_logs,
      recorded_lectures: parsed.recorded_lectures ?? base.recorded_lectures,
      fund_donations: parsed.fund_donations ?? base.fund_donations,
      fund_allocations: parsed.fund_allocations ?? base.fund_allocations,
      fund_audit_logs: parsed.fund_audit_logs ?? base.fund_audit_logs,
      success_stories: parsed.success_stories ?? base.success_stories,
      activity_photos: parsed.activity_photos ?? base.activity_photos,
    };
  } catch {
    return base;
  }
}

export function writeLocalDb(next: LocalDatabaseState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DB_KEY, JSON.stringify(next));
}

export function updateLocalDb(
  updater: (db: LocalDatabaseState) => LocalDatabaseState,
): LocalDatabaseState {
  const updated = updater(readLocalDb());
  writeLocalDb(updated);
  return updated;
}

export function makeLocalId(prefix = "rec"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isSchemaMissingError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (error.message?.includes("schema cache") ?? false) ||
    (error.message?.includes("does not exist") ?? false)
  );
}

export function shouldUseLocalMode(error?: { code?: string; message?: string } | null): boolean {
  if (!isLocalDevHost()) return false;
  if (getLocalDevSession()) return true;
  if (!error) return true;
  return isSchemaMissingError(error);
}

export function readLocalEnquiries(): LocalEnquiryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ENQUIRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalEnquiryItem[]) : [];
  } catch {
    return [];
  }
}

export function appendLocalEnquiry(item: LocalEnquiryItem): LocalEnquiryItem[] {
  const next = [item, ...readLocalEnquiries()].slice(0, 50);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(next));
  }
  return next;
}
