import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { TRANSLATIONS } from "@/lib/i18n";
import {
  createInitialChatSession,
  extractStudentDraftFromCall,
  generateRabataAgentReply,
  normalizeClassLevel,
  parseSarvamWebhookPayload,
  RABATA_SARVAM_SYSTEM_PROMPT,
} from "@/lib/sarvam-agent";
import { site } from "@/lib/site";
import { resources } from "@/lib/resources";
import { calculateFundSummary, extractYouTubeId, getQuizForLecture } from "@/lib/platform";
import {
  buildVerificationQrSvg,
  calculateAttendanceMetrics,
  calculateOverallAcademicProgress,
  calculateSubjectPercentage,
} from "@/lib/academic-profiles";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing & configuration", () => {
  it("uses Rabata's official email, helpline phone, and never a personal inbox", () => {
    expect(site.email).toBe("rabataofficial111@gmail.com");
    expect(site.email).not.toContain("rathoretammana447");
    expect(site.phone).toBe("+917965481661");
    expect(site.phoneDisplay).toBe("+91 79654 81661");
  });

  it.each([
    "/",
    "/about",
    "/learn",
    "/students",
    "/impact",
    "/funds",
    "/community",
    "/skills",
    "/get-involved",
    "/contact",
    "/student-registration",
    "/volunteer",
    "/privacy",
    "/auth",
  ])("matches a page for %s instead of falling back to not found", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes(path);

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("attributes every external learning resource to a publisher", () => {
    expect(resources.length).toBeGreaterThan(8);
    for (const item of resources) {
      expect(item.publisher.trim().length).toBeGreaterThan(0);
      expect(item.url.startsWith("https://")).toBe(true);
    }
  });
});

describe("Platform helpers", () => {
  it("returns zero totals for an empty fund ledger", () => {
    const empty = calculateFundSummary([], []);
    expect(empty.totalReceivedInr).toBe(0);
    expect(empty.totalSpentInr).toBe(0);
    expect(empty.totalPlannedInr).toBe(0);
    expect(empty.availableBalanceInr).toBe(0);
  });

  it("computes received, spent, planned, available balance and category shares accurately", () => {
    const summary = calculateFundSummary(
      [
        {
          id: "d1",
          received_date: "2026-11-01",
          amount_inr: 5000,
          is_public_acknowledgement: true,
          public_label: "Well-wisher",
          purpose: "Books",
        },
        {
          id: "d2",
          received_date: "2026-11-02",
          amount_inr: 3000,
          is_public_acknowledgement: false,
          public_label: "Anonymous",
          purpose: "Food drive",
        },
      ],
      [
        {
          amount_inr: 2000,
          entry_type: "expenditure",
          category: "Learning Materials & Books",
          is_published: true,
        },
        {
          amount_inr: 2000,
          entry_type: "expenditure",
          category: "Community Food Drives",
          is_published: true,
        },
        {
          amount_inr: 1500,
          entry_type: "planned_allocation",
          category: "Digital & Computer Education",
          is_published: true,
        },
      ],
    );

    expect(summary.totalReceivedInr).toBe(8000);
    expect(summary.totalSpentInr).toBe(4000);
    expect(summary.totalPlannedInr).toBe(1500);
    expect(summary.availableBalanceInr).toBe(4000);
    expect(summary.acknowledgedDonations).toHaveLength(1);
    const books = summary.categoryBreakdown.find(
      (c) => c.category === "Learning Materials & Books",
    );
    expect(books?.sharePercent).toBe(50);
  });

  it("extracts YouTube video IDs from watch, short, and embed URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=O-6q-siuMik")).toBe("O-6q-siuMik");
    expect(extractYouTubeId("https://youtu.be/O-6q-siuMik")).toBe("O-6q-siuMik");
    expect(extractYouTubeId("O-6q-siuMik")).toBe("O-6q-siuMik");
    expect(extractYouTubeId("https://example.com/lecture.mp4")).toBeNull();
  });

  it("computes academic percentages, progress tiers and attendance metrics", () => {
    expect(calculateSubjectPercentage(42, 50)).toBe(84);
    expect(calculateSubjectPercentage(0, 0)).toBe(0);

    const overall = calculateOverallAcademicProgress([
      {
        id: "1",
        subject: "English",
        totalMarks: 100,
        marksObtained: 86,
        percentage: 86,
        previousMarks: 70,
        currentMarks: 86,
        teacherRemarks: "",
      },
      {
        id: "2",
        subject: "Mathematics",
        totalMarks: 100,
        marksObtained: 74,
        percentage: 74,
        previousMarks: 60,
        currentMarks: 74,
        teacherRemarks: "",
      },
    ]);
    expect(overall.percentage).toBe(80);
    expect(overall.tier).toBe("Excellent");
    expect(overall.strongestSubject).toBe("English");
    expect(overall.needsAttentionSubject).toBe("Mathematics");

    const att = calculateAttendanceMetrics({
      "2026-11-01": "present",
      "2026-11-02": "present",
      "2026-11-03": "present",
      "2026-11-04": "absent",
    });
    expect(att.totalConducted).toBe(4);
    expect(att.attended).toBe(3);
    expect(att.missed).toBe(1);
    expect(att.percentage).toBe(75);
  });

  it("supports English, Hindi, and Punjabi translations for grassroots access", () => {
    for (const lang of ["en", "hi", "pa"] as const) {
      expect(TRANSLATIONS[lang].nav.home.trim().length).toBeGreaterThan(0);
      expect(TRANSLATIONS[lang].enquiryForm.studentHeading.trim().length).toBeGreaterThan(0);
      expect(TRANSLATIONS[lang].enquiryForm.submitStudent.trim().length).toBeGreaterThan(0);
    }
  });

  it("returns 3 valid multiple-choice practice questions per recorded lecture", () => {
    for (const id of ["lec-1", "lec-2", "lec-3", "unknown-id"]) {
      const questions = getQuizForLecture({ id, subject: "Science" });
      expect(questions).toHaveLength(3);
      for (const q of questions) {
        expect(q.options.length).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
      }
    }
  });

  it("builds a deterministic SVG verification QR code for student PDF reports", () => {
    const svg = buildVerificationQrSvg(
      "RBT-VER-RBT-2026-001",
      "https://rabata-hub-connect-main.vercel.app/students",
    );
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('aria-label="Verification QR code RBT-VER-RBT-2026-001"');
    expect(svg).toContain("<rect");
  });

  it("shares the unified Sarvam AI prompt, parses Samvaad webhook transcripts, and completes chatbot registration flows", () => {
    expect(RABATA_SARVAM_SYSTEM_PROMPT).toContain("+917965481661");
    expect(RABATA_SARVAM_SYSTEM_PROMPT).toContain("Tammana Rathore");
    expect(RABATA_SARVAM_SYSTEM_PROMPT).toContain("1098");

    const call = parseSarvamWebhookPayload(
      JSON.stringify({
        interaction_id: "20261120/test-hi",
        user_phone_number: "+919814000001",
        output_agent_variables: {
          kind: "student",
          name: "Diya",
          email: "parent.diya@example.com",
          classLevel: "4–5",
          subjects: "English, Math",
        },
        interaction_transcript: [
          {
            turn_id: 1,
            role: "user",
            en_text: "Register my daughter Diya",
            indic_text: "मेरी बेटी दीया का पंजीकरण करें",
          },
        ],
      }),
    );
    expect(call.detected_language).toBe("hi-IN");
    expect(call.output_agent_variables.name).toBe("Diya");
    expect(call.interaction_transcript).toHaveLength(1);

    // Real Sarvam Samvaad analytics shape (agent_variables, duration_in_seconds, original/translate_transcript)
    const liveCall = parseSarvamWebhookPayload(
      JSON.stringify({
        interaction_id: "20261120/3b2fa9f9-15:00:30-aw19d73d",
        duration_in_seconds: 90.5,
        start_datetime: "2026-11-20T09:30:30",
        language_name: "English",
        user_contact: "+919876046899",
        bot_contact_identifier: "+917965481661",
        agent_variables: {
          user_name: "Manan",
          call_summary: "A 15-year-old student called to inquire about classes.",
          kind: "student",
          consent: "false",
        },
        original_transcript: [{ role: "agent", text: "Hello, welcome to Rabata." }],
        translate_transcript: [{ role: "agent", text: "Hello, welcome to Rabata." }],
      }),
    );
    expect(liveCall.duration).toBe(90.5);
    expect(liveCall.user_phone_number).toBe("+919876046899");
    expect(liveCall.output_agent_variables.kind).toBe("student");
    expect(liveCall.output_agent_variables.consent).toBe(false);
    expect(liveCall.start_datetime).toBe("2026-11-20T09:30:30Z");
    expect(liveCall.interaction_transcript[0]?.indic_text).toBeUndefined();

    const state = createInitialChatSession("en");
    const emergency = generateRabataAgentReply("Someone is in danger", state, "en");
    expect(emergency.reply).toContain("112");
    expect(emergency.reply).toContain("1098");

    // General questions must NOT trap the user inside student registration
    const infoAnswer = generateRabataAgentReply("What classes do you teach?", state, "en");
    expect(infoAnswer.nextState.stage).toBe("idle");
    expect(infoAnswer.reply).toContain("Classes 1–12");

    // One-shot multi-entity extraction + mid-flow question + cancel resilience
    const firstTurn = generateRabataAgentReply(
      "Enroll my daughter Diya in Class 5 for English and Math, email parent.diya@example.com",
      state,
      "en",
    );
    expect(firstTurn.nextState.name).toBe("Diya");
    expect(firstTurn.nextState.classLevel).toBe("4–5");
    expect(firstTurn.nextState.email).toBe("parent.diya@example.com");
    expect(firstTurn.nextState.stage).toBe("student_consent");

    // Asking a question mid-flow answers cleanly without overwriting student's name
    const midQuestion = generateRabataAgentReply("Are classes free?", firstTurn.nextState, "en");
    expect(midQuestion.reply).toContain("100% free");
    expect(midQuestion.nextState.name).toBe("Diya");

    const done = generateRabataAgentReply("Yes, I consent", midQuestion.nextState, "en");
    expect(done.completedEnquiry?.kind).toBe("student");
    expect(done.completedEnquiry?.name).toBe("Diya");
    expect(done.completedEnquiry?.email).toBe("parent.diya@example.com");

    // Cancel must clear any active draft cleanly
    const started = generateRabataAgentReply(
      "Register a student",
      createInitialChatSession("en"),
      "en",
    );
    const cancelled = generateRabataAgentReply("cancel", started.nextState, "en");
    expect(cancelled.nextState.stage).toBe("idle");

    // Greetings and emails must not pollute name or class slots in web chatbot
    const greetTurn = generateRabataAgentReply("hi", started.nextState, "en");
    expect(greetTurn.nextState.name).toBe("");
    const nameEmailTurn = generateRabataAgentReply(
      "jayant, jayantkumawat802@gmail.com",
      greetTurn.nextState,
      "en",
    );
    expect(nameEmailTurn.nextState.name).toBe("Jayant");
    expect(nameEmailTurn.nextState.email).toBe("jayantkumawat802@gmail.com");
    expect(nameEmailTurn.nextState.classLevel).toBe("");
  });

  it("extracts pre-filled student enrollment drafts cleanly from call & chat transcripts", () => {
    expect(normalizeClassLevel("jayant, jayantkumawat802@gmail")).toBe("");
    expect(normalizeClassLevel("Class 7")).toBe("6–8");
    expect(normalizeClassLevel("Young adult")).toBe("Young adult");

    const adultCall = parseSarvamWebhookPayload(
      JSON.stringify({
        interaction_id: "20261120/tamanna-call",
        user_contact: "+919876046899",
        agent_variables: {
          kind: "student",
          name: "Tamanna",
          classLevel: "Young adult",
          subjects: "Academic support, spoken English",
          consent: false,
        },
        translate_transcript: [{ role: "user", text: "My name is Tamanna, I am 19 years old." }],
      }),
    );
    const adultDraft = extractStudentDraftFromCall(adultCall);
    expect(adultDraft.first_name).toBe("Tamanna");
    expect(adultDraft.class_level).toBe("Young adult");
    expect(adultDraft.guardian_phone).toBe("+919876046899");
    expect(adultDraft.guardian_email).toBe("");
    expect(adultDraft.guardian_consent).toBe(false);

    const teenAgeCall = parseSarvamWebhookPayload(
      JSON.stringify({
        interaction_id: "20261120/teen-call",
        user_contact: "+919876046899",
        agent_variables: { kind: "student" },
        translate_transcript: [
          { role: "user", text: "I want to learn. I am 15 years old." },
          { role: "agent", text: "We teach English, Science, Math and Computers." },
        ],
      }),
    );
    const teenDraft = extractStudentDraftFromCall(teenAgeCall);
    expect(teenDraft.first_name).toBe("");
    expect(teenDraft.class_level).toBe("9–10");
    expect(teenDraft.guardian_phone).toBe("+919876046899");
    expect(teenDraft.subjects_needed).toBe("");

    const spokenDetailsCall = parseSarvamWebhookPayload(
      JSON.stringify({
        interaction_id: "20261120/rohan-call",
        user_contact: "+919814000002",
        agent_variables: { kind: "student" },
        translate_transcript: [
          {
            role: "user",
            text: "My name is Rohan, I am in class 7 and need help with Science and Math.",
          },
        ],
      }),
    );
    const rohanDraft = extractStudentDraftFromCall(spokenDetailsCall);
    expect(rohanDraft.first_name).toBe("Rohan");
    expect(rohanDraft.class_level).toBe("6–8");
    expect(rohanDraft.subjects_needed).toContain("Mathematics");
    expect(rohanDraft.subjects_needed).toContain("Science");

    const noisyWebChat = parseSarvamWebhookPayload(
      JSON.stringify({
        interaction_id: "20261121/noisy-chat",
        channel: "rabata_web_chatbot",
        user_phone_number: "jayantkumawat802@gmail.com",
        output_agent_variables: {
          kind: "student",
          name: "hi",
          email: "jayantkumawat802@gmail.com",
          classLevel: "jayant, jayantkumawat802@gmail",
          subjects: "englihs",
        },
      }),
    );
    const webDraft = extractStudentDraftFromCall(noisyWebChat);
    expect(webDraft.first_name).toBe("");
    expect(webDraft.guardian_phone).toBe("");
    expect(webDraft.guardian_email).toBe("jayantkumawat802@gmail.com");
    expect(webDraft.class_level).toBe("");
    expect(webDraft.subjects_needed).toBe("English");
  });
});
