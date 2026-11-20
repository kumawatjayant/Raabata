import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  LOCAL_DEV_ACCOUNTS,
  makeLocalId,
  readLocalDb,
  shouldUseLocalMode,
  updateLocalDb,
} from "./local-store";
import type { StudentRecordRow } from "./platform";

export const LEARNING_DEV_CATEGORIES = [
  "Reading Skills",
  "Writing Skills",
  "English Communication",
  "Computer Literacy",
  "General Knowledge",
  "Confidence and Participation",
  "Practical and Technical Skills",
] as const;

export type LearningDevCategory = (typeof LEARNING_DEV_CATEGORIES)[number];
export type GoalStatus = "Not Started" | "In Progress" | "Completed";
export type AttendanceDayStatus = "present" | "absent" | "excused";
export type ProgressTier = "Excellent" | "Good" | "Improving" | "Needs Support";

export interface SubjectPerformanceItem {
  id: string;
  subject: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  previousMarks: number;
  currentMarks: number;
  teacherRemarks: string;
}

export interface MonthlyAssessmentItem {
  id: string;
  month: string;
  overallPercentage: number;
  readingScore: number;
  writingScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  notes: string;
}

export interface LearningDevelopmentItem {
  category: LearningDevCategory;
  rating: number;
  level: "Emerging" | "Developing" | "Proficient" | "Advanced";
  observations: string;
}

export interface TeacherFeedbackRecord {
  academicStrengths: string;
  areasOfImprovement: string;
  areasRequiringAttention: string;
  monthlyFeedback: string;
  recommendedActivities: string;
  nextMonthGoals: string;
  teacherName: string;
  updatedAt: string;
}

export interface LearningGoalItem {
  id: string;
  title: string;
  category: string;
  status: GoalStatus;
  targetDate: string;
}

export interface AcademicDocumentItem {
  id: string;
  title: string;
  docType: "Certificate" | "Report Card" | "Achievement" | "Worksheet";
  issueDate: string;
  fileUrl: string;
  notes: string;
}

export interface StudentAcademicProfile {
  studentId: string;
  studentCode: string;
  studentUserId: string | null;
  fullName: string;
  photoUrl: string | null;
  age: number | null;
  classGrade: string;
  schoolName: string;
  preferredLanguage: string;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  joinedDate: string;
  educationalGoals: string;
  subjectsEnrolled: string[];
  subjectPerformances: SubjectPerformanceItem[];
  monthlyAssessments: MonthlyAssessmentItem[];
  attendanceCalendar: Record<string, AttendanceDayStatus>;
  learningDevelopment: LearningDevelopmentItem[];
  teacherFeedback: TeacherFeedbackRecord;
  learningGoals: LearningGoalItem[];
  academicDocuments: AcademicDocumentItem[];
  overallPercentage: number;
  progressTier: ProgressTier;
  strongestSubject: string | null;
  needsAttentionSubject: string | null;
  totalConducted: number;
  attendedClasses: number;
  missedClasses: number;
  attendancePercentage: number;
  assignedMentorNames: string[];
}

export function calculateSubjectPercentage(obtained: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(obtained) || obtained < 0) {
    return 0;
  }
  return Math.min(100, Math.round((obtained / total) * 100));
}

export function ratingToSkillLevel(
  rating: number,
): "Emerging" | "Developing" | "Proficient" | "Advanced" {
  if (rating >= 85) return "Advanced";
  if (rating >= 70) return "Proficient";
  if (rating >= 50) return "Developing";
  return "Emerging";
}

export function calculateOverallAcademicProgress(subjects: SubjectPerformanceItem[]): {
  percentage: number;
  tier: ProgressTier;
  strongestSubject: string | null;
  needsAttentionSubject: string | null;
} {
  if (subjects.length === 0) {
    return {
      percentage: 0,
      tier: "Needs Support",
      strongestSubject: null,
      needsAttentionSubject: null,
    };
  }
  const totals = subjects.reduce(
    (acc, s) => {
      const pct = calculateSubjectPercentage(s.marksObtained, s.totalMarks);
      return { sum: acc.sum + pct, count: acc.count + 1 };
    },
    { sum: 0, count: 0 },
  );
  const percentage = Math.round(totals.sum / totals.count);
  const tier: ProgressTier =
    percentage >= 80
      ? "Excellent"
      : percentage >= 65
        ? "Good"
        : percentage >= 50
          ? "Improving"
          : "Needs Support";

  const sorted = [...subjects].sort(
    (a, b) =>
      calculateSubjectPercentage(b.marksObtained, b.totalMarks) -
      calculateSubjectPercentage(a.marksObtained, a.totalMarks),
  );
  const strongestSubject = sorted[0]?.subject ?? null;
  const weakest = sorted[sorted.length - 1];
  const needsAttentionSubject = weakest && sorted.length > 1 ? weakest.subject : strongestSubject;

  return { percentage, tier, strongestSubject, needsAttentionSubject };
}

export function calculateAttendanceMetrics(
  calendar: Record<string, AttendanceDayStatus>,
  fallbackAttended = 0,
  fallbackTotal = 0,
): {
  totalConducted: number;
  attended: number;
  missed: number;
  percentage: number;
} {
  const entries = Object.values(calendar);
  if (entries.length === 0) {
    const total = Math.max(0, fallbackTotal);
    const att = Math.min(total, Math.max(0, fallbackAttended));
    return {
      totalConducted: total,
      attended: att,
      missed: Math.max(0, total - att),
      percentage: total > 0 ? Math.round((att / total) * 100) : 0,
    };
  }
  const attended = entries.filter((s) => s === "present").length;
  const missed = entries.filter((s) => s === "absent").length;
  const totalConducted = attended + missed + entries.filter((s) => s === "excused").length;
  return {
    totalConducted,
    attended,
    missed,
    percentage: totalConducted > 0 ? Math.round((attended / totalConducted) * 100) : 0,
  };
}

function defaultLearningDevelopment(): LearningDevelopmentItem[] {
  return LEARNING_DEV_CATEGORIES.map((category) => ({
    category,
    rating: 60,
    level: "Developing",
    observations: "Active participation in guided sessions.",
  }));
}

function defaultTeacherFeedback(): TeacherFeedbackRecord {
  return {
    academicStrengths: "Consistent curiosity and willingness to learn.",
    areasOfImprovement: "Regular revision and structured writing practice.",
    areasRequiringAttention: "Vocabulary retention and timed problem solving.",
    monthlyFeedback: "Making steady progress in weekly mentorship classes.",
    recommendedActivities: "15 minutes daily reading aloud and 5 new English words per day.",
    nextMonthGoals: "Complete monthly assessment with 10% score improvement.",
    teacherName: "Tammana Rathore",
    updatedAt: "2026-11-18",
  };
}

const ACADEMIC_STORAGE_KEY = "rabata_academic_profiles_v2";

type StoredAcademicRow = {
  student_id: string;
  student_code: string;
  full_name: string;
  photo_url: string | null;
  age: number | null;
  class_grade: string;
  school_name: string;
  preferred_language: string;
  joined_date: string;
  educational_goals: string;
  subjects_enrolled: string[];
  subject_performances: SubjectPerformanceItem[];
  monthly_assessments: MonthlyAssessmentItem[];
  attendance_calendar: Record<string, AttendanceDayStatus>;
  learning_development: LearningDevelopmentItem[];
  teacher_feedback: TeacherFeedbackRecord;
  learning_goals: LearningGoalItem[];
  academic_documents: AcademicDocumentItem[];
};

function seededShowcaseRows(): Record<string, StoredAcademicRow> {
  return {
    "stu-aarav-1": {
      student_id: "stu-aarav-1",
      student_code: "RBT-2026-001",
      full_name: "Aarav Sharma",
      photo_url: null,
      age: 12,
      class_grade: "Class 7",
      school_name: "Govt. Model Middle School, Derabassi",
      preferred_language: "Hindi and English",
      joined_date: "2026-06-15",
      educational_goals:
        "Build strong English reading fluency, speak confidently in class, and master middle-school mathematics.",
      subjects_enrolled: ["English", "Mathematics", "Science", "Computer Education"],
      subject_performances: [
        {
          id: "sub-a1",
          subject: "English",
          totalMarks: 100,
          marksObtained: 82,
          percentage: 82,
          previousMarks: 68,
          currentMarks: 82,
          teacherRemarks: "Strong progress in reading comprehension and spoken introductions.",
        },
        {
          id: "sub-a2",
          subject: "Mathematics",
          totalMarks: 100,
          marksObtained: 74,
          percentage: 74,
          previousMarks: 62,
          currentMarks: 74,
          teacherRemarks: "Improved accuracy on fractions; needs extra practice on word problems.",
        },
        {
          id: "sub-a3",
          subject: "Science",
          totalMarks: 100,
          marksObtained: 79,
          percentage: 79,
          previousMarks: 70,
          currentMarks: 79,
          teacherRemarks: "Curiosity during concept discussions and neat diagram notebooks.",
        },
        {
          id: "sub-a4",
          subject: "Computer Education",
          totalMarks: 100,
          marksObtained: 88,
          percentage: 88,
          previousMarks: 76,
          currentMarks: 88,
          teacherRemarks: "Quickly learned keyboard navigation and file organization.",
        },
      ],
      monthly_assessments: [
        {
          id: "m-a1",
          month: "Aug 2026",
          overallPercentage: 64,
          readingScore: 60,
          writingScore: 58,
          communicationScore: 55,
          problemSolvingScore: 62,
          notes: "Baseline evaluation after joining Rabata.",
        },
        {
          id: "m-a2",
          month: "Sep 2026",
          overallPercentage: 71,
          readingScore: 70,
          writingScore: 65,
          communicationScore: 66,
          problemSolvingScore: 68,
          notes: "Started reading short passages aloud every session.",
        },
        {
          id: "m-a3",
          month: "Oct 2026",
          overallPercentage: 76,
          readingScore: 78,
          writingScore: 71,
          communicationScore: 75,
          problemSolvingScore: 72,
          notes: "Noticeable leap in English speaking confidence.",
        },
        {
          id: "m-a4",
          month: "Nov 2026",
          overallPercentage: 81,
          readingScore: 84,
          writingScore: 76,
          communicationScore: 82,
          problemSolvingScore: 77,
          notes: "Leading group vocabulary warm-ups with peers.",
        },
      ],
      attendance_calendar: {
        "2026-11-02": "present",
        "2026-11-04": "present",
        "2026-11-06": "present",
        "2026-11-09": "absent",
        "2026-11-11": "present",
        "2026-11-13": "present",
        "2026-11-16": "present",
        "2026-11-18": "present",
        "2026-11-20": "present",
      },
      learning_development: [
        {
          category: "Reading Skills",
          rating: 84,
          level: "Proficient",
          observations: "Reads Grade 7 English paragraphs smoothly with clear pronunciation.",
        },
        {
          category: "Writing Skills",
          rating: 75,
          level: "Proficient",
          observations: "Writes neat short paragraphs; working on punctuation consistency.",
        },
        {
          category: "English Communication",
          rating: 82,
          level: "Proficient",
          observations: "Confidently introduces himself and asks questions in English.",
        },
        {
          category: "Computer Literacy",
          rating: 88,
          level: "Advanced",
          observations: "Comfortable creating documents and using safe online learning tools.",
        },
        {
          category: "General Knowledge",
          rating: 76,
          level: "Proficient",
          observations: "Engages actively in weekly current-affairs discussions.",
        },
        {
          category: "Confidence and Participation",
          rating: 86,
          level: "Advanced",
          observations: "Helps younger students settle in and volunteers for activities.",
        },
        {
          category: "Practical and Technical Skills",
          rating: 78,
          level: "Proficient",
          observations: "Applies science and computer concepts cleanly to real tasks.",
        },
      ],
      teacher_feedback: {
        academicStrengths:
          "Enthusiastic learner with fast improvement in spoken English and computers.",
        areasOfImprovement: "Sentence punctuation and multi-step math word problems.",
        areasRequiringAttention: "Checking arithmetic steps before finalizing answers.",
        monthlyFeedback:
          "Aarav has grown from a quiet listener into an active class leader over four months.",
        recommendedActivities:
          "Read one NCERT chapter summary aloud twice a week and practice 5 fraction problems daily.",
        nextMonthGoals: "Score 80%+ in Mathematics unit test and deliver a 2-minute English talk.",
        teacherName: "Ananya Sharma & Tammana Rathore",
        updatedAt: "2026-11-18",
      },
      learning_goals: [
        {
          id: "g-a1",
          title: "Improve English sentence formation & daily speaking fluency",
          category: "English Communication",
          status: "Completed",
          targetDate: "2026-11-15",
        },
        {
          id: "g-a2",
          title: "Strengthen mathematical concepts (fractions & ratios)",
          category: "Mathematics",
          status: "In Progress",
          targetDate: "2026-12-10",
        },
        {
          id: "g-a3",
          title: "Create a personal presentation slide on renewable energy",
          category: "Computer Literacy",
          status: "Not Started",
          targetDate: "2026-12-20",
        },
      ],
      academic_documents: [
        {
          id: "doc-a1",
          title: "Rabata Spoken English Milestone Certificate",
          docType: "Certificate",
          issueDate: "2026-11-10",
          fileUrl: "/images/education.jpeg",
          notes: "Awarded for consistent attendance and active English circle participation.",
        },
      ],
    },
    "stu-meera-2": {
      student_id: "stu-meera-2",
      student_code: "RBT-2026-002",
      full_name: "Meera Kaur",
      photo_url: null,
      age: 14,
      class_grade: "Class 9",
      school_name: "Govt. Senior Secondary School, Derabassi",
      preferred_language: "Hindi and English",
      joined_date: "2026-07-04",
      educational_goals:
        "Excel in Class 9 English and Social Science while building essay-writing and presentation skills.",
      subjects_enrolled: ["English", "Social Science", "Science", "Mathematics"],
      subject_performances: [
        {
          id: "sub-m1",
          subject: "English",
          totalMarks: 100,
          marksObtained: 86,
          percentage: 86,
          previousMarks: 74,
          currentMarks: 86,
          teacherRemarks: "Thoughtful essay structure and clear grammar usage.",
        },
        {
          id: "sub-m2",
          subject: "Social Science",
          totalMarks: 100,
          marksObtained: 81,
          percentage: 81,
          previousMarks: 72,
          currentMarks: 81,
          teacherRemarks: "Strong memory for historical timelines and civic concepts.",
        },
        {
          id: "sub-m3",
          subject: "Science",
          totalMarks: 100,
          marksObtained: 68,
          percentage: 68,
          previousMarks: 60,
          currentMarks: 68,
          teacherRemarks: "Improving steadily; revisit numerical physics problems.",
        },
        {
          id: "sub-m4",
          subject: "Mathematics",
          totalMarks: 100,
          marksObtained: 64,
          percentage: 64,
          previousMarks: 54,
          currentMarks: 64,
          teacherRemarks: "Showing steady confidence in linear equations; continue daily practice.",
        },
      ],
      monthly_assessments: [
        {
          id: "m-m1",
          month: "Aug 2026",
          overallPercentage: 65,
          readingScore: 70,
          writingScore: 68,
          communicationScore: 62,
          problemSolvingScore: 56,
          notes: "Strong language foundation; needs boost in Math confidence.",
        },
        {
          id: "m-m2",
          month: "Sep 2026",
          overallPercentage: 70,
          readingScore: 75,
          writingScore: 74,
          communicationScore: 68,
          problemSolvingScore: 61,
          notes: "Practised structured essays and algebra basics.",
        },
        {
          id: "m-m3",
          month: "Oct 2026",
          overallPercentage: 73,
          readingScore: 80,
          writingScore: 78,
          communicationScore: 74,
          problemSolvingScore: 64,
          notes: "Consistent homework completion.",
        },
        {
          id: "m-m4",
          month: "Nov 2026",
          overallPercentage: 75,
          readingScore: 84,
          writingScore: 82,
          communicationScore: 78,
          problemSolvingScore: 67,
          notes: "Ready for peer debate practice.",
        },
      ],
      attendance_calendar: {
        "2026-11-02": "present",
        "2026-11-05": "present",
        "2026-11-07": "present",
        "2026-11-10": "present",
        "2026-11-12": "excused",
        "2026-11-14": "present",
        "2026-11-16": "present",
        "2026-11-19": "present",
      },
      learning_development: [
        {
          category: "Reading Skills",
          rating: 86,
          level: "Advanced",
          observations: "Reads Class 9 NCERT chapters independently with strong inference.",
        },
        {
          category: "Writing Skills",
          rating: 84,
          level: "Proficient",
          observations: "Drafts coherent paragraphs and formal letters.",
        },
        {
          category: "English Communication",
          rating: 78,
          level: "Proficient",
          observations: "Expresses ideas clearly; gaining fluency in impromptu speaking.",
        },
        {
          category: "Computer Literacy",
          rating: 68,
          level: "Developing",
          observations: "Learning document formatting and online research.",
        },
        {
          category: "General Knowledge",
          rating: 82,
          level: "Proficient",
          observations: "Well informed about Indian civics and geography.",
        },
        {
          category: "Confidence and Participation",
          rating: 79,
          level: "Proficient",
          observations: "Participates thoughtfully in group discussions.",
        },
        {
          category: "Practical and Technical Skills",
          rating: 70,
          level: "Proficient",
          observations: "Organizes study notes systematically.",
        },
      ],
      teacher_feedback: {
        academicStrengths: "Expressive writer and attentive mentor to younger peers.",
        areasOfImprovement: "Algebraic problem solving speed and Science numericals.",
        areasRequiringAttention: "Class 9 geometry theorems.",
        monthlyFeedback:
          "Excellent progress in English and Social Science; keep building Math stamina.",
        recommendedActivities:
          "Solve 4 linear equation exercises daily and review Khan Academy fractions.",
        nextMonthGoals: "Reach 72%+ in Science & Math mid-term revision tests.",
        teacherName: "Ananya Sharma",
        updatedAt: "2026-11-17",
      },
      learning_goals: [
        {
          id: "g-m1",
          title: "Improve reading fluency & essay transitions",
          category: "Writing Skills",
          status: "Completed",
          targetDate: "2026-11-05",
        },
        {
          id: "g-m2",
          title: "Strengthen mathematical concepts in linear equations",
          category: "Mathematics",
          status: "In Progress",
          targetDate: "2026-12-15",
        },
      ],
      academic_documents: [],
    },
    "stu-kabir-3": {
      student_id: "stu-kabir-3",
      student_code: "RBT-2026-003",
      full_name: "Kabir Singh",
      photo_url: null,
      age: 15,
      class_grade: "Class 10",
      school_name: "Punjab State High School, Derabassi",
      preferred_language: "Punjabi",
      joined_date: "2026-08-01",
      educational_goals:
        "Prepare for Class 10 board Science and learn practical computer skills and workplace communication.",
      subjects_enrolled: ["Science", "Mathematics", "Computer Education", "English"],
      subject_performances: [
        {
          id: "sub-k1",
          subject: "Computer Education",
          totalMarks: 100,
          marksObtained: 84,
          percentage: 84,
          previousMarks: 70,
          currentMarks: 84,
          teacherRemarks: "Strong grasp of spreadsheet formulas and digital safety.",
        },
        {
          id: "sub-k2",
          subject: "Science",
          totalMarks: 100,
          marksObtained: 71,
          percentage: 71,
          previousMarks: 58,
          currentMarks: 71,
          teacherRemarks: "Understands core concepts; practice writing complete definitions.",
        },
        {
          id: "sub-k3",
          subject: "Mathematics",
          totalMarks: 100,
          marksObtained: 62,
          percentage: 62,
          previousMarks: 50,
          currentMarks: 62,
          teacherRemarks: "Consistent effort; revise trigonometry formulas regularly.",
        },
        {
          id: "sub-k4",
          subject: "English",
          totalMarks: 100,
          marksObtained: 59,
          percentage: 59,
          previousMarks: 48,
          currentMarks: 59,
          teacherRemarks: "Building confidence in spoken answers and comprehension.",
        },
      ],
      monthly_assessments: [
        {
          id: "m-k1",
          month: "Aug 2026",
          overallPercentage: 56,
          readingScore: 52,
          writingScore: 50,
          communicationScore: 48,
          problemSolvingScore: 60,
          notes: "Initial assessment on joining online mentoring batch.",
        },
        {
          id: "m-k2",
          month: "Sep 2026",
          overallPercentage: 61,
          readingScore: 58,
          writingScore: 56,
          communicationScore: 55,
          problemSolvingScore: 66,
          notes: "Started weekly Science concept quizzes.",
        },
        {
          id: "m-k3",
          month: "Oct 2026",
          overallPercentage: 66,
          readingScore: 63,
          writingScore: 61,
          communicationScore: 60,
          problemSolvingScore: 71,
          notes: "Good improvement in Computer Literacy tasks.",
        },
        {
          id: "m-k4",
          month: "Nov 2026",
          overallPercentage: 69,
          readingScore: 67,
          writingScore: 65,
          communicationScore: 64,
          problemSolvingScore: 75,
          notes: "Steady upward trajectory across all four subjects.",
        },
      ],
      attendance_calendar: {
        "2026-11-03": "present",
        "2026-11-05": "present",
        "2026-11-10": "absent",
        "2026-11-12": "present",
        "2026-11-14": "present",
        "2026-11-17": "present",
        "2026-11-19": "present",
      },
      learning_development: [
        {
          category: "Reading Skills",
          rating: 67,
          level: "Developing",
          observations: "Comprehends technical text well; increasing English reading pace.",
        },
        {
          category: "Writing Skills",
          rating: 65,
          level: "Developing",
          observations: "Can write crisp Science bullet points.",
        },
        {
          category: "English Communication",
          rating: 64,
          level: "Developing",
          observations: "Participates well when prompted with structured questions.",
        },
        {
          category: "Computer Literacy",
          rating: 85,
          level: "Advanced",
          observations: "Proficient in typing, email etiquette, and spreadsheets.",
        },
        {
          category: "General Knowledge",
          rating: 74,
          level: "Proficient",
          observations: "Shows keen interest in technology and vocational careers.",
        },
        {
          category: "Confidence and Participation",
          rating: 72,
          level: "Proficient",
          observations: "Growing more comfortable presenting solutions online.",
        },
        {
          category: "Practical and Technical Skills",
          rating: 82,
          level: "Proficient",
          observations: "Strong hands-on troubleshooting ability.",
        },
      ],
      teacher_feedback: {
        academicStrengths: "Analytical thinking and strong aptitude for computer tools.",
        areasOfImprovement: "Spoken English confidence and structured long-form answers.",
        areasRequiringAttention: "Class 10 English grammar & letter writing.",
        monthlyFeedback: "Kabir has raised his overall score by 13% since August.",
        recommendedActivities:
          "Watch two spoken English recorded lessons weekly and practice mock board papers.",
        nextMonthGoals: "Cross 65% in English and 75% in Science.",
        teacherName: "Rohan Verma",
        updatedAt: "2026-11-18",
      },
      learning_goals: [
        {
          id: "g-k1",
          title: "Develop basic computer skills & spreadsheet proficiency",
          category: "Computer Literacy",
          status: "Completed",
          targetDate: "2026-11-01",
        },
        {
          id: "g-k2",
          title: "Build confidence in English communication",
          category: "English Communication",
          status: "In Progress",
          targetDate: "2026-12-15",
        },
      ],
      academic_documents: [],
    },
  };
}

function readLocalAcademicMap(): Record<string, StoredAcademicRow> {
  const seed = seededShowcaseRows();
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(ACADEMIC_STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Record<string, StoredAcademicRow>;
    return { ...seed, ...parsed };
  } catch {
    return seed;
  }
}

function writeLocalAcademicMap(map: Record<string, StoredAcademicRow>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACADEMIC_STORAGE_KEY, JSON.stringify(map));
}

function buildFallbackAcademicRow(student: StudentRecordRow, index: number): StoredAcademicRow {
  return {
    student_id: student.id,
    student_code: `RBT-2026-${String(index + 1).padStart(3, "0")}`,
    full_name: student.first_name,
    photo_url: null,
    age: null,
    class_grade: student.class_level,
    school_name: "Rabata Community Learning Centre",
    preferred_language: student.preferred_language,
    joined_date: student.created_at.slice(0, 10),
    educational_goals:
      student.learning_goals ?? "Build strong foundational academic and life skills.",
    subjects_enrolled: student.subjects_needed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    subject_performances: [],
    monthly_assessments: [],
    attendance_calendar: {},
    learning_development: defaultLearningDevelopment(),
    teacher_feedback: defaultTeacherFeedback(),
    learning_goals: [],
    academic_documents: [],
  };
}

function hydrateProfile(
  student: StudentRecordRow,
  acad: StoredAcademicRow,
  mentorNames: string[],
  includeGuardianContact: boolean,
): StudentAcademicProfile {
  const subjects = acad.subject_performances ?? [];
  const overall = calculateOverallAcademicProgress(subjects);
  const attendance = calculateAttendanceMetrics(
    acad.attendance_calendar ?? {},
    student.attendance_count,
    student.total_sessions,
  );

  return {
    studentId: student.id,
    studentCode: acad.student_code,
    studentUserId: student.student_user_id,
    fullName: acad.full_name || student.first_name,
    photoUrl: acad.photo_url,
    age: acad.age,
    classGrade: acad.class_grade || student.class_level,
    schoolName: acad.school_name,
    preferredLanguage: acad.preferred_language || student.preferred_language,
    guardianName: includeGuardianContact ? student.guardian_name : null,
    guardianEmail: includeGuardianContact ? student.guardian_email : null,
    guardianPhone: includeGuardianContact ? student.guardian_phone : null,
    joinedDate: acad.joined_date,
    educationalGoals: acad.educational_goals,
    subjectsEnrolled:
      acad.subjects_enrolled.length > 0
        ? acad.subjects_enrolled
        : student.subjects_needed
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    subjectPerformances: subjects,
    monthlyAssessments: acad.monthly_assessments ?? [],
    attendanceCalendar: acad.attendance_calendar ?? {},
    learningDevelopment:
      acad.learning_development.length > 0
        ? acad.learning_development
        : defaultLearningDevelopment(),
    teacherFeedback: acad.teacher_feedback?.teacherName
      ? acad.teacher_feedback
      : defaultTeacherFeedback(),
    learningGoals: acad.learning_goals ?? [],
    academicDocuments: acad.academic_documents ?? [],
    overallPercentage: overall.percentage,
    progressTier: overall.tier,
    strongestSubject: overall.strongestSubject,
    needsAttentionSubject: overall.needsAttentionSubject,
    totalConducted: attendance.totalConducted,
    attendedClasses: attendance.attended,
    missedClasses: attendance.missed,
    attendancePercentage: attendance.percentage,
    assignedMentorNames: mentorNames,
  };
}

export type ViewerRole = "admin" | "mentor" | "student" | "anon";

export async function fetchAccessibleStudentProfiles(
  viewerRole: ViewerRole,
  viewerUserId: string | null,
): Promise<StudentAcademicProfile[]> {
  if (viewerRole === "anon" || !viewerUserId) return [];

  const includeGuardianContact = viewerRole === "admin";

  if (shouldUseLocalMode()) {
    const db = readLocalDb();
    const acadMap = readLocalAcademicMap();
    const mentorNames = new Map<string, string>(
      db.mentor_profiles.map((m) => [m.user_id, m.full_name]),
    );
    for (const acc of Object.values(LOCAL_DEV_ACCOUNTS)) {
      if (acc.role === "mentor" && !mentorNames.has(acc.userId)) {
        mentorNames.set(acc.userId, acc.displayName);
      }
    }

    let visibleStudents = db.student_records;
    if (viewerRole === "mentor") {
      const assignedIds = new Set(
        db.mentor_student_assignments
          .filter((a) => a.mentor_user_id === viewerUserId && a.active)
          .map((a) => a.student_id),
      );
      visibleStudents = visibleStudents.filter(
        (s) => assignedIds.has(s.id) || s.created_by === viewerUserId,
      );
    } else if (viewerRole === "student") {
      visibleStudents = visibleStudents.filter((s) => s.student_user_id === viewerUserId);
    }

    return visibleStudents.map((stu, idx) => {
      const acad = acadMap[stu.id] ?? buildFallbackAcademicRow(stu, idx);
      const assignedMentors = db.mentor_student_assignments
        .filter((a) => a.student_id === stu.id && a.active)
        .map((a) => mentorNames.get(a.mentor_user_id) ?? "Rabata Mentor");
      return hydrateProfile(stu, acad, assignedMentors, includeGuardianContact);
    });
  }

  const [studentsRes, acadRes, assignmentsRes, mentorsRes] = await Promise.all([
    supabase.from("student_records").select("*").order("created_at", { ascending: false }),
    supabase.from("student_academic_profiles").select("*"),
    supabase.from("mentor_student_assignments").select("*").eq("active", true),
    supabase.from("mentor_profiles").select("user_id,full_name"),
  ]);

  if (shouldUseLocalMode(acadRes.error ?? studentsRes.error)) {
    return [];
  }

  const students = (studentsRes.data ?? []) as StudentRecordRow[];
  const acadRows = acadRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const mentorMap = new Map((mentorsRes.data ?? []).map((m) => [m.user_id, m.full_name]));
  const acadById = new Map(acadRows.map((row) => [row.student_id, row]));

  return students.map((stu, idx) => {
    const dbRow = acadById.get(stu.id);
    const acad: StoredAcademicRow = dbRow
      ? {
          student_id: dbRow.student_id,
          student_code: dbRow.student_code,
          full_name: dbRow.full_name,
          photo_url: dbRow.photo_url,
          age: dbRow.age,
          class_grade: dbRow.class_grade,
          school_name: dbRow.school_name,
          preferred_language: dbRow.preferred_language,
          joined_date: dbRow.joined_date,
          educational_goals: dbRow.educational_goals,
          subjects_enrolled: dbRow.subjects_enrolled ?? [],
          subject_performances:
            (dbRow.subject_performances as unknown as SubjectPerformanceItem[]) ?? [],
          monthly_assessments:
            (dbRow.monthly_assessments as unknown as MonthlyAssessmentItem[]) ?? [],
          attendance_calendar:
            (dbRow.attendance_calendar as unknown as Record<string, AttendanceDayStatus>) ?? {},
          learning_development:
            (dbRow.learning_development as unknown as LearningDevelopmentItem[]) ??
            defaultLearningDevelopment(),
          teacher_feedback:
            (dbRow.teacher_feedback as unknown as TeacherFeedbackRecord) ??
            defaultTeacherFeedback(),
          learning_goals: (dbRow.learning_goals as unknown as LearningGoalItem[]) ?? [],
          academic_documents: (dbRow.academic_documents as unknown as AcademicDocumentItem[]) ?? [],
        }
      : buildFallbackAcademicRow(stu, idx);

    const assignedMentors = assignments
      .filter((a) => a.student_id === stu.id)
      .map((a) => mentorMap.get(a.mentor_user_id) ?? "Rabata Mentor");

    return hydrateProfile(stu, acad, assignedMentors, includeGuardianContact);
  });
}

export async function saveAcademicProfile(
  profile: StudentAcademicProfile,
  updatedByUserId?: string | null,
): Promise<void> {
  const row: StoredAcademicRow = {
    student_id: profile.studentId,
    student_code: profile.studentCode,
    full_name: profile.fullName,
    photo_url: profile.photoUrl,
    age: profile.age,
    class_grade: profile.classGrade,
    school_name: profile.schoolName,
    preferred_language: profile.preferredLanguage,
    joined_date: profile.joinedDate,
    educational_goals: profile.educationalGoals,
    subjects_enrolled: profile.subjectsEnrolled,
    subject_performances: profile.subjectPerformances,
    monthly_assessments: profile.monthlyAssessments,
    attendance_calendar: profile.attendanceCalendar,
    learning_development: profile.learningDevelopment,
    teacher_feedback: profile.teacherFeedback,
    learning_goals: profile.learningGoals,
    academic_documents: profile.academicDocuments,
  };

  const att = calculateAttendanceMetrics(
    profile.attendanceCalendar,
    profile.attendedClasses,
    profile.totalConducted,
  );

  if (shouldUseLocalMode()) {
    const map = readLocalAcademicMap();
    map[profile.studentId] = row;
    writeLocalAcademicMap(map);
    updateLocalDb((db) => ({
      ...db,
      student_records: db.student_records.map((s) =>
        s.id === profile.studentId
          ? {
              ...s,
              first_name: profile.fullName.split(" ")[0] || profile.fullName,
              class_level: profile.classGrade,
              subjects_needed: profile.subjectsEnrolled.join(", "),
              preferred_language: profile.preferredLanguage,
              attendance_count: att.attended,
              total_sessions: att.totalConducted,
              progress_summary: profile.teacherFeedback.monthlyFeedback,
              updated_at: new Date().toISOString(),
            }
          : s,
      ),
    }));
    return;
  }

  const { error } = await supabase.from("student_academic_profiles").upsert({
    student_id: row.student_id,
    student_code: row.student_code,
    full_name: row.full_name,
    photo_url: row.photo_url,
    age: row.age,
    class_grade: row.class_grade,
    school_name: row.school_name,
    preferred_language: row.preferred_language,
    joined_date: row.joined_date,
    educational_goals: row.educational_goals,
    subjects_enrolled: row.subjects_enrolled,
    subject_performances: row.subject_performances as unknown as Json,
    monthly_assessments: row.monthly_assessments as unknown as Json,
    attendance_calendar: row.attendance_calendar as unknown as Json,
    learning_development: row.learning_development as unknown as Json,
    teacher_feedback: row.teacher_feedback as unknown as Json,
    learning_goals: row.learning_goals as unknown as Json,
    academic_documents: row.academic_documents as unknown as Json,
    updated_by: updatedByUserId ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export interface NewStudentInput {
  fullName: string;
  age: number | null;
  classGrade: string;
  schoolName: string;
  preferredLanguage: string;
  subjectsEnrolled: string[];
  guardianName: string | null;
  guardianEmail: string;
  guardianPhone: string | null;
  joinedDate: string;
  educationalGoals: string;
  photoUrl: string | null;
}

export async function registerNewStudentProfile(
  input: NewStudentInput,
  createdByUserId: string | null,
): Promise<StudentAcademicProfile> {
  const now = new Date().toISOString();
  const id = makeLocalId("stu");
  const code = `RBT-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 899))}`;
  const subjectsString = input.subjectsEnrolled.join(", ") || "English, Mathematics";

  if (shouldUseLocalMode()) {
    const newStudent: StudentRecordRow = {
      id,
      student_user_id: null,
      first_name: input.fullName.split(" ")[0] || input.fullName,
      guardian_name: input.guardianName,
      guardian_email: input.guardianEmail,
      guardian_phone: input.guardianPhone,
      class_level: input.classGrade,
      subjects_needed: subjectsString,
      preferred_language: input.preferredLanguage,
      preferred_format: "In person",
      learning_goals: input.educationalGoals,
      attendance_count: 0,
      total_sessions: 0,
      progress_summary: null,
      status: "active",
      guardian_consent: true,
      created_by: createdByUserId,
      created_at: now,
      updated_at: now,
    };
    updateLocalDb((db) => ({ ...db, student_records: [newStudent, ...db.student_records] }));

    const row: StoredAcademicRow = {
      student_id: id,
      student_code: code,
      full_name: input.fullName,
      photo_url: input.photoUrl,
      age: input.age,
      class_grade: input.classGrade,
      school_name: input.schoolName,
      preferred_language: input.preferredLanguage,
      joined_date: input.joinedDate,
      educational_goals: input.educationalGoals,
      subjects_enrolled: input.subjectsEnrolled,
      subject_performances: [],
      monthly_assessments: [],
      attendance_calendar: {},
      learning_development: defaultLearningDevelopment(),
      teacher_feedback: defaultTeacherFeedback(),
      learning_goals: [],
      academic_documents: [],
    };
    const map = readLocalAcademicMap();
    map[id] = row;
    writeLocalAcademicMap(map);
    return hydrateProfile(newStudent, row, [], true);
  }

  const { data: inserted, error: stuErr } = await supabase
    .from("student_records")
    .insert({
      first_name: input.fullName.slice(0, 100),
      guardian_name: input.guardianName,
      guardian_email: input.guardianEmail,
      guardian_phone: input.guardianPhone,
      class_level: input.classGrade,
      subjects_needed: subjectsString,
      preferred_language: input.preferredLanguage,
      learning_goals: input.educationalGoals,
      guardian_consent: true,
      created_by: createdByUserId,
    })
    .select("*")
    .single();
  if (stuErr || !inserted) throw stuErr ?? new Error("Unable to create student record.");

  const row: StoredAcademicRow = {
    student_id: inserted.id,
    student_code: code,
    full_name: input.fullName,
    photo_url: input.photoUrl,
    age: input.age,
    class_grade: input.classGrade,
    school_name: input.schoolName,
    preferred_language: input.preferredLanguage,
    joined_date: input.joinedDate,
    educational_goals: input.educationalGoals,
    subjects_enrolled: input.subjectsEnrolled,
    subject_performances: [],
    monthly_assessments: [],
    attendance_calendar: {},
    learning_development: defaultLearningDevelopment(),
    teacher_feedback: defaultTeacherFeedback(),
    learning_goals: [],
    academic_documents: [],
  };

  const { error: acadErr } = await supabase.from("student_academic_profiles").insert({
    student_id: row.student_id,
    student_code: row.student_code,
    full_name: row.full_name,
    photo_url: row.photo_url,
    age: row.age,
    class_grade: row.class_grade,
    school_name: row.school_name,
    preferred_language: row.preferred_language,
    joined_date: row.joined_date,
    educational_goals: row.educational_goals,
    subjects_enrolled: row.subjects_enrolled,
    subject_performances: [] as unknown as Json,
    monthly_assessments: [] as unknown as Json,
    attendance_calendar: {} as unknown as Json,
    learning_development: row.learning_development as unknown as Json,
    teacher_feedback: row.teacher_feedback as unknown as Json,
    learning_goals: [] as unknown as Json,
    academic_documents: [] as unknown as Json,
    updated_by: createdByUserId,
  });
  if (acadErr) throw acadErr;

  return hydrateProfile(inserted as StudentRecordRow, row, [], true);
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function downloadStudentProgressReportPdf(
  profile: StudentAcademicProfile,
  includeGuardianContact: boolean,
): boolean {
  if (typeof window === "undefined") return false;
  const win = window.open("", "_blank", "width=900,height=1050");
  if (!win) return false;

  const subjectRows = profile.subjectPerformances
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.subject)}</td>
        <td>${s.totalMarks}</td>
        <td>${s.marksObtained}</td>
        <td><strong>${calculateSubjectPercentage(s.marksObtained, s.totalMarks)}%</strong></td>
        <td>${s.previousMarks}</td>
        <td>${s.currentMarks}</td>
        <td>${escapeHtml(s.teacherRemarks)}</td>
      </tr>`,
    )
    .join("");

  const devRows = profile.learningDevelopment
    .map(
      (d) => `
      <tr>
        <td><strong>${escapeHtml(d.category)}</strong></td>
        <td>${d.rating}% (${escapeHtml(d.level)})</td>
        <td>${escapeHtml(d.observations)}</td>
      </tr>`,
    )
    .join("");

  const goalRows = profile.learningGoals
    .map(
      (g) => `
      <li><strong>[${escapeHtml(g.status)}]</strong> ${escapeHtml(g.title)} (${escapeHtml(g.category)})</li>`,
    )
    .join("");

  const monthBars = profile.monthlyAssessments
    .map(
      (m) => `
      <div style="flex:1;text-align:center;">
        <div style="height:100px;display:flex;align-items:flex-end;justify-content:center;">
          <div style="width:28px;height:${Math.max(8, m.overallPercentage)}%;background:#2f6b3c;border-radius:4px 4px 0 0;"></div>
        </div>
        <div style="font-size:11px;margin-top:4px;"><strong>${m.overallPercentage}%</strong><br/>${escapeHtml(m.month)}</div>
      </div>`,
    )
    .join("");

  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Rabata Progress Report - ${escapeHtml(profile.fullName)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1b2838; margin: 32px; line-height: 1.5; }
      h1, h2, h3 { margin: 0 0 8px 0; color: #1a2d4c; }
      .header { display:flex; justify-content:space-between; border-bottom:3px solid #d4a638; padding-bottom:14px; margin-bottom:20px; }
      .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; font-size:13px; margin-bottom:20px; }
      .box { border:1px solid #d8dee6; border-radius:6px; padding:14px; margin-bottom:18px; }
      table { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }
      th, td { border:1px solid #d8dee6; padding:7px 9px; text-align:left; }
      th { background:#eef4ee; color:#1a2d4c; }
      @media print { body { margin: 16px; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#2f6b3c;font-weight:bold;">Rabata · Learn. Empower. Rise.</div>
        <h1>Student Academic Progress Report</h1>
        <div style="font-size:12px;color:#556;">Derabassi, Punjab, India · rabataofficial111@gmail.com</div>
      </div>
      <div style="text-align:right;font-size:12px;">
        <strong>Student ID:</strong> ${escapeHtml(profile.studentCode)}<br/>
        <strong>Report Date:</strong> ${new Date().toLocaleDateString("en-IN")}<br/>
        <strong>Overall Progress:</strong> ${profile.overallPercentage}% (${escapeHtml(profile.progressTier)})
      </div>
    </div>

    <div class="box">
      <h3>A. Student Information</h3>
      <div class="grid">
        <div><strong>Full Name:</strong> ${escapeHtml(profile.fullName)}</div>
        <div><strong>Class / Grade:</strong> ${escapeHtml(profile.classGrade)}</div>
        <div><strong>School:</strong> ${escapeHtml(profile.schoolName || "—")}</div>
        <div><strong>Age / Language:</strong> ${profile.age ?? "—"} · ${escapeHtml(profile.preferredLanguage)}</div>
        <div><strong>Joined Rabata:</strong> ${escapeHtml(profile.joinedDate)}</div>
        <div><strong>Attendance:</strong> ${profile.attendedClasses}/${profile.totalConducted} (${profile.attendancePercentage}%)</div>
        ${
          includeGuardianContact
            ? `<div style="grid-column:1/-1;"><strong>Parent / Guardian Contact:</strong> ${escapeHtml(profile.guardianName || "Parent/Guardian")} · ${escapeHtml(profile.guardianEmail || "")} ${profile.guardianPhone ? `· ${escapeHtml(profile.guardianPhone)}` : ""}</div>`
            : ""
        }
      </div>
    </div>

    <div class="box">
      <h3>B. Subject-wise Academic Performance</h3>
      <table>
        <thead><tr><th>Subject</th><th>Total</th><th>Obtained</th><th>Percentage</th><th>Previous</th><th>Current</th><th>Teacher's Remarks</th></tr></thead>
        <tbody>${subjectRows || `<tr><td colspan="7">No subject marks recorded yet.</td></tr>`}</tbody>
      </table>
    </div>

    <div class="box">
      <h3>C. Monthly Academic Progress</h3>
      <div style="display:flex;gap:14px;align-items:flex-end;margin-top:10px;">
        ${monthBars || `<div style="font-size:12px;color:#667;">No monthly assessments recorded yet.</div>`}
      </div>
    </div>

    <div class="box">
      <h3>D. Skills &amp; Learning Development</h3>
      <table>
        <thead><tr><th>Skill Category</th><th>Progress Rating</th><th>Teacher Observations</th></tr></thead>
        <tbody>${devRows}</tbody>
      </table>
    </div>

    <div class="box">
      <h3>E. Teacher's Remarks, Achievements &amp; Future Learning Goals</h3>
      <p style="font-size:12px;"><strong>Strengths:</strong> ${escapeHtml(profile.teacherFeedback.academicStrengths)}</p>
      <p style="font-size:12px;"><strong>Areas Requiring Attention:</strong> ${escapeHtml(profile.teacherFeedback.areasRequiringAttention)}</p>
      <p style="font-size:12px;"><strong>Monthly Feedback:</strong> ${escapeHtml(profile.teacherFeedback.monthlyFeedback)}</p>
      <p style="font-size:12px;"><strong>Next Month's Learning Goals:</strong> ${escapeHtml(profile.teacherFeedback.nextMonthGoals)}</p>
      <ul style="font-size:12px;">${goalRows || "<li>No specific learning goals listed yet.</li>"}</ul>
      ${
        profile.academicDocuments.length > 0
          ? `<p style="font-size:12px;"><strong>Certificates &amp; Achievements:</strong> ${profile.academicDocuments.map((d) => escapeHtml(d.title)).join(", ")}</p>`
          : ""
      }
    </div>
    <script>setTimeout(() => { window.print(); }, 250);</script>
  </body>
  </html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
