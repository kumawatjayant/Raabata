import type { AdminEnquiryItem } from "./enquiries.functions";
import type { AppLanguage } from "./i18n";
import { makeLocalId } from "./local-store";
import { site } from "./site";

export const RABATA_SARVAM_FIRST_MESSAGE =
  "Namaste! Welcome to Rabata — Connecting Education with Opportunity. I’m Rabata’s virtual assistant. Ask me about our free classes, or tell me if you’d like to register a student, volunteer as a mentor, or support our initiatives.";

export const RABATA_SARVAM_SYSTEM_PROMPT = `# Role & Identity
You are the official Voice & Chat AI Assistant for Rabata (राबता), a community-led education, mentorship, and skills initiative founded by educator Tammana Rathore in Derabassi, Punjab, India.
Your tagline and mission: "Learn. Empower. Rise. Connecting education with opportunity."

# Voice, Tone & Language
- Tone: Warm, humble, patient, encouraging, and respectful. Many callers and visitors may be parents or students from underserved backgrounds — speak clearly, avoid jargon, and never sound rushed or robotic.
- Language Adaptation: Default to clear, simple English, and smoothly switch to Hindi, Hinglish, or Punjabi (Gurmukhi/Roman) whenever the user prefers or speaks in those languages.
- Brevity: Keep each response to 1–3 short sentences and ask only one question at a time.

# Key Facts About Rabata (Strict Truthfulness)
- What We Offer (100% Free):
  1. Academic Support (Classes 1–12 & Young Adults): English, Science, Mathematics, and foundational literacy.
  2. Spoken English & Confidence: Everyday conversation, grammar, vocabulary, and public speaking.
  3. Digital Literacy: Basic computer skills, internet safety, and everyday digital tools.
  4. Skills & Career Readiness: Resume writing, mock interview preparation, workplace etiquette, and career guidance.
  5. Recorded Lectures & Learning Library: Subject-wise and topic-wise recorded lessons with practice quizzes plus NCERT, NIELIT, Khan Academy, GCFGlobal, and British Council resources (/learn).
  6. Community Care: Community food donation drives providing freshly prepared home-cooked meals to children.
- Where We Operate: Derabassi, Punjab, India. In-person teaching currently takes place in the founder's residential learning space, alongside online support. Important: Never share a private residential street address; inform callers visits are scheduled directly by Tammana after enquiry review.
- Official Channels:
  - 24x7 Multilingual Helpline (Sarvam AI): ${site.phoneDisplay} (${site.phone})
  - Website: https://rabata-hub-connect-main.vercel.app
  - Official Email: ${site.email}
  - Instagram: @rabata._.official and founder @rathore._.tammana

# Call & Chat Handling Flows
## Flow 1: Parent, Guardian, or Learner Enquiring About Classes (Student Registration)
1. Safeguarding Check: If under 18, confirm you are speaking with a parent or legal guardian (adult learners 18+ may register themselves).
2. Collect: Student's first name (first name only), parent/guardian email, class/grade level (1–3, 4–5, 6–8, 9–10, 11–12, or Young adult), subjects/skills needed, preferred language, preferred format (In person, Online, or Either), and explicit consent.

## Flow 2: Volunteer Teacher or Mentor Enquiry
1. Confirm 18+ eligibility and note that volunteer applications are reviewed before teaching begins.
2. Collect full name, email, qualifications, subjects/classes, languages, availability, experience, motivation, and consent.

## Flow 3: Donations, Learning Materials, Food Drives, or Partnerships
1. Explain support options (books, notebooks, digital equipment, food drives, career workshops) and Open Fund Transparency (/funds).
2. Never ask for credit card numbers, UPI PINs, or bank credentials. Collect supporter name, email, and contribution idea.

# Strict Child Safeguarding, Privacy & Safety Rules
1. Never collect Aadhaar numbers, government IDs, a child's personal mobile number, home address, or financial credentials.
2. Never share private details of any Rabata student or mentor.
3. Never invent unverified statistics or job placement guarantees (Rabata supports ~10–15 children with direct individual attention).
4. Emergency Protocol: If someone reports a child in immediate danger in India, immediately direct them to dial 112 (Emergency) or 1098 (Childline India).`;

export interface SarvamTranscriptTurn {
  turn_id: number;
  role: "agent" | "user";
  en_text: string;
  indic_text?: string;
}

export interface SarvamOutputVariables {
  kind: "student" | "volunteer" | "contact";
  name: string;
  email: string;
  classLevel?: string;
  subjects?: string;
  language?: string;
  format?: string;
  qualifications?: string;
  experience?: string;
  availability?: string;
  message: string;
  consent: boolean;
  resolved_intent?: string;
}

export interface SarvamCallRecord {
  id: string;
  interaction_id: string;
  app_id: string;
  deployment_id: string;
  channel: "sarvam_voice_call" | "rabata_web_chatbot";
  user_phone_number: string;
  agent_phone_number: string;
  duration: number;
  status: "connected" | "completed" | "enrolled" | "missed";
  detected_language: "hi-IN" | "pa-IN" | "en-IN";
  stt_model: string;
  tts_model: string;
  llm_model: string;
  start_datetime: string;
  end_datetime: string;
  output_agent_variables: SarvamOutputVariables;
  interaction_transcript: SarvamTranscriptTurn[];
}

export const SEEDED_SARVAM_CALLS: SarvamCallRecord[] = [
  {
    id: "srv-call-1",
    interaction_id: "20261120/rabata-8448d531-hi",
    app_id: "rabata-samvaad-helpline",
    deployment_id: "rabata-voice-prod-v3",
    channel: "sarvam_voice_call",
    user_phone_number: "+919814201104",
    agent_phone_number: site.phone,
    duration: 94.6,
    status: "completed",
    detected_language: "hi-IN",
    stt_model: "Saaras v2",
    tts_model: "Bulbul v1 (Meera)",
    llm_model: "Sarvam AI Samvaad",
    start_datetime: "2026-11-20T10:14:00+05:30",
    end_datetime: "2026-11-20T10:15:35+05:30",
    output_agent_variables: {
      kind: "student",
      name: "Ananya",
      email: "parent.ananya@example.com",
      classLevel: "4–5",
      subjects: "Spoken English, Mathematics",
      language: "Hindi",
      format: "In person",
      message:
        "Parent from Derabassi called Sarvam helpline (+91 79654 81661) to register Ananya (Class 5) for free Spoken English and Maths support.",
      consent: true,
      resolved_intent: "student_registration",
    },
    interaction_transcript: [
      {
        turn_id: 1,
        role: "agent",
        en_text:
          "Namaste! Welcome to Rabata. Are you calling to register a student, volunteer, or support our work?",
        indic_text:
          "नमस्ते! राबता में आपका स्वागत है। क्या आप छात्र पंजीकरण, स्वयंसेवा या सहयोग के लिए कॉल कर रहे हैं?",
      },
      {
        turn_id: 2,
        role: "user",
        en_text: "Namaste, I want to register my daughter Ananya in Class 5 for English and Math.",
        indic_text: "नमस्ते, मुझे अपनी बेटी अनन्या (कक्षा 5) के लिए अंग्रेज़ी और गणित की फ्री क्लास चाहिए।",
      },
      {
        turn_id: 3,
        role: "agent",
        en_text:
          "Wonderful! Since Ananya is under 18, could you share your parent email and confirm consent for Tammana to follow up?",
        indic_text:
          "बहुत अच्छा! चूंकि अनन्या 18 वर्ष से कम हैं, कृपया अभिभावक ईमेल बताएं और संपर्क हेतु सहमति की पुष्टि करें।",
      },
      {
        turn_id: 4,
        role: "user",
        en_text:
          "Yes, parent.ananya@example.com. Please teach in Hindi and English in person at Derabassi. I consent.",
        indic_text:
          "जी हाँ, ईमेल parent.ananya@example.com है। डेराबस्सी में हिंदी-अंग्रेज़ी में ऑफलाइन पढ़ाइए। मेरी पूरी सहमति है।",
      },
    ],
  },
  {
    id: "srv-call-2",
    interaction_id: "20261120/rabata-9172a410-pa",
    app_id: "rabata-samvaad-helpline",
    deployment_id: "rabata-voice-prod-v3",
    channel: "sarvam_voice_call",
    user_phone_number: "+919876542219",
    agent_phone_number: site.phone,
    duration: 78.2,
    status: "completed",
    detected_language: "pa-IN",
    stt_model: "Saaras v2",
    tts_model: "Bulbul v1 (Simran)",
    llm_model: "Sarvam AI Samvaad",
    start_datetime: "2026-11-20T12:40:00+05:30",
    end_datetime: "2026-11-20T12:41:18+05:30",
    output_agent_variables: {
      kind: "student",
      name: "Harpreet",
      email: "family.harpreet@example.com",
      classLevel: "6–8",
      subjects: "Science, Digital literacy",
      language: "Punjabi",
      format: "In person",
      message:
        "Guardian called from Mubarakpur near Derabassi seeking free Class 7 Science revision and basic computer literacy.",
      consent: true,
      resolved_intent: "student_registration",
    },
    interaction_transcript: [
      {
        turn_id: 1,
        role: "agent",
        en_text:
          "Sat Sri Akal and Namaste! Welcome to Rabata Derabassi. How may I assist you today?",
        indic_text: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਰਾਬਤਾ ਡੇਰਾਬੱਸੀ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਦੱਸੋ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?",
      },
      {
        turn_id: 2,
        role: "user",
        en_text:
          "My grandson Harpreet is in Class 7. He needs help with Science and basic computers.",
        indic_text: "ਮੇਰੇ ਪੋਤੇ ਹਰਪ੍ਰੀਤ ਸੱਤਵੀਂ ਜਮਾਤ ਵਿੱਚ ਹਨ। ਉਨ੍ਹਾਂ ਨੂੰ ਸਾਇੰਸ ਅਤੇ ਕੰਪਿਊਟਰ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ।",
      },
      {
        turn_id: 3,
        role: "agent",
        en_text:
          "Both are 100% free at Rabata. Could you confirm your contact email and whether you consent for Tammana to call back?",
        indic_text: "ਰਾਬਤਾ ਵਿੱਚ ਇਹ ਬਿਲਕੁਲ ਮੁਫ਼ਤ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਈਮੇਲ ਦੱਸੋ ਅਤੇ ਵਾਪਸੀ ਸੰਪਰਕ ਲਈ ਸਹਿਮਤੀ ਦਿਓ।",
      },
      {
        turn_id: 4,
        role: "user",
        en_text: "Email is family.harpreet@example.com and yes, I give full consent.",
        indic_text: "ਈਮੇਲ family.harpreet@example.com ਹੈ ਅਤੇ ਹਾਂ, ਮੈਂ ਪੂਰੀ ਸਹਿਮਤੀ ਦਿੰਦਾ ਹਾਂ।",
      },
    ],
  },
  {
    id: "srv-call-3",
    interaction_id: "20261120/rabata-5531f920-en",
    app_id: "rabata-samvaad-helpline",
    deployment_id: "rabata-voice-prod-v3",
    channel: "sarvam_voice_call",
    user_phone_number: "+919915803402",
    agent_phone_number: site.phone,
    duration: 64.0,
    status: "completed",
    detected_language: "en-IN",
    stt_model: "Saaras v2",
    tts_model: "Bulbul v1 (Ananya)",
    llm_model: "Sarvam AI Samvaad",
    start_datetime: "2026-11-20T16:05:00+05:30",
    end_datetime: "2026-11-20T16:06:04+05:30",
    output_agent_variables: {
      kind: "volunteer",
      name: "Priya Nair",
      email: "priya.nair@example.com",
      classLevel: "6–10",
      subjects: "English, Spoken Communication",
      language: "English",
      format: "Online",
      qualifications: "M.A. English Literature",
      availability: "Saturdays 4 PM – 6 PM",
      message:
        "Caller offered 2 hours every weekend as a remote English speaking and interview mentor.",
      consent: true,
      resolved_intent: "volunteer_application",
    },
    interaction_transcript: [
      {
        turn_id: 1,
        role: "agent",
        en_text:
          "Namaste! Welcome to Rabata. Are you calling about classes, volunteering, or donations?",
      },
      {
        turn_id: 2,
        role: "user",
        en_text:
          "Hi, I am Priya Nair. I have an M.A. in English and would like to volunteer online on Saturdays for Classes 6 to 10.",
      },
      {
        turn_id: 3,
        role: "agent",
        en_text:
          "Thank you, Priya! Confirming you are 18+, please share your email so Tammana can review your volunteer application.",
      },
      {
        turn_id: 4,
        role: "user",
        en_text: "I am over 18, email is priya.nair@example.com, and I agree to be contacted.",
      },
    ],
  },
];

const SARVAM_CALLS_STORAGE_KEY = "rabata_sarvam_calls_v2";

export function readStoredWebCalls(): SarvamCallRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SARVAM_CALLS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SarvamCallRecord[]) : [];
  } catch {
    return [];
  }
}

export function readSarvamCalls(): SarvamCallRecord[] {
  const stored = readStoredWebCalls();
  return stored.length > 0 ? stored : SEEDED_SARVAM_CALLS;
}

export function writeSarvamCalls(calls: SarvamCallRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SARVAM_CALLS_STORAGE_KEY, JSON.stringify(calls.slice(0, 80)));
  } catch {
    // ignore storage quota errors
  }
}

export function prependSarvamCall(call: SarvamCallRecord): SarvamCallRecord[] {
  const existing = readSarvamCalls().filter(
    (c) => c.id !== call.id && c.interaction_id !== call.interaction_id,
  );
  const next = [call, ...existing];
  writeSarvamCalls(next);
  return next;
}

export function updateSarvamCallStatus(
  id: string,
  status: SarvamCallRecord["status"],
): SarvamCallRecord[] {
  const next = readSarvamCalls().map((c) => (c.id === id ? { ...c, status } : c));
  writeSarvamCalls(next);
  return next;
}

function ensureIsoUtc(raw: unknown, fallbackIso: string): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return fallbackIso;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) return `${s}Z`;
  return s;
}

export function normalizeSarvamWebhookObject(obj: Record<string, unknown>): SarvamCallRecord {
  const pickObject = (key: string): Record<string, unknown> | null => {
    const val = obj[key];
    return val && typeof val === "object" && !Array.isArray(val)
      ? (val as Record<string, unknown>)
      : null;
  };
  const varsRaw = (pickObject("output_agent_variables") ??
    pickObject("agent_variables") ??
    pickObject("extracted_variables") ??
    {}) as Record<string, unknown>;

  const originalSource = Array.isArray(obj["original_transcript"])
    ? (obj["original_transcript"] as unknown[])
    : [];
  const translatedSource = Array.isArray(obj["translate_transcript"])
    ? (obj["translate_transcript"] as unknown[])
    : [];
  const rawTranscriptSource = Array.isArray(obj["interaction_transcript"])
    ? (obj["interaction_transcript"] as unknown[])
    : translatedSource.length > 0
      ? translatedSource
      : originalSource.length > 0
        ? originalSource
        : Array.isArray(obj["transcript"])
          ? (obj["transcript"] as unknown[])
          : Array.isArray(obj["messages"])
            ? (obj["messages"] as unknown[])
            : [];

  const transcript: SarvamTranscriptTurn[] = rawTranscriptSource.map((item, idx) => {
    if (typeof item === "string") {
      return { turn_id: idx + 1, role: idx % 2 === 0 ? "agent" : "user", en_text: item };
    }
    const turn = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const origTurn =
      originalSource[idx] && typeof originalSource[idx] === "object"
        ? (originalSource[idx] as Record<string, unknown>)
        : null;
    const roleRaw = String(turn["role"] ?? turn["speaker"] ?? "").toLowerCase();
    const role: "agent" | "user" =
      roleRaw === "user" || roleRaw === "caller" || roleRaw === "customer" ? "user" : "agent";
    const enText = String(
      turn["en_text"] ?? turn["text"] ?? turn["content"] ?? turn["indic_text"] ?? "",
    ).trim();
    const out: SarvamTranscriptTurn = {
      turn_id: typeof turn["turn_id"] === "number" ? turn["turn_id"] : idx + 1,
      role,
      en_text: enText,
    };
    const indicCandidate =
      typeof turn["indic_text"] === "string" && turn["indic_text"].trim()
        ? turn["indic_text"].trim()
        : origTurn && typeof origTurn["text"] === "string"
          ? origTurn["text"].trim()
          : "";
    if (indicCandidate && indicCandidate !== enText) {
      out.indic_text = indicCandidate;
    }
    return out;
  });

  const nonEmptyStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const intentOrKind = (
    nonEmptyStr(varsRaw["kind"]) ||
    nonEmptyStr(varsRaw["customer_intent"]) ||
    nonEmptyStr(obj["intent"]) ||
    "contact"
  ).toLowerCase();
  const kind: SarvamOutputVariables["kind"] = intentOrKind.includes("volunteer")
    ? "volunteer"
    : intentOrKind.includes("student")
      ? "student"
      : "contact";

  const langHint = `${nonEmptyStr(obj["language_name"])} ${nonEmptyStr(varsRaw["language"])} ${JSON.stringify(transcript)}`;
  const detectedLanguage: SarvamCallRecord["detected_language"] = /hindi|[\u0900-\u097F]/i.test(
    langHint,
  )
    ? "hi-IN"
    : /punjabi|[\u0A00-\u0A7F]/i.test(langHint)
      ? "pa-IN"
      : "en-IN";

  const nowIso = new Date().toISOString();
  const transcriptSummary = transcript
    .filter((t) => t.role === "user")
    .map((t) => t.en_text)
    .join(" | ");

  const callerPhone =
    nonEmptyStr(obj["user_phone_number"]) ||
    nonEmptyStr(obj["user_contact"]) ||
    nonEmptyStr(obj["user_contact_masked"]) ||
    nonEmptyStr(obj["from"]) ||
    nonEmptyStr(obj["caller_number"]) ||
    "+9198XXXXXXXX";
  const digits = callerPhone.replace(/\D/g, "") || "caller";
  const rawEmail = nonEmptyStr(varsRaw["email"]);
  const safeEmail = rawEmail.includes("@") ? rawEmail : `call.${digits}@voice.rabata.local`;

  const displayName =
    nonEmptyStr(varsRaw["name"]) ||
    nonEmptyStr(varsRaw["student_name"]) ||
    nonEmptyStr(varsRaw["caller_name"]) ||
    `Caller ${callerPhone}`;

  const outputVars: SarvamOutputVariables = {
    kind,
    name: displayName.slice(0, 100),
    email: safeEmail.slice(0, 255),
    ...(nonEmptyStr(varsRaw["classLevel"] ?? varsRaw["class_level"])
      ? { classLevel: nonEmptyStr(varsRaw["classLevel"] ?? varsRaw["class_level"]) }
      : {}),
    ...(nonEmptyStr(varsRaw["subjects"]) ? { subjects: nonEmptyStr(varsRaw["subjects"]) } : {}),
    language:
      nonEmptyStr(varsRaw["language"]) ||
      nonEmptyStr(obj["language_name"]) ||
      (detectedLanguage === "hi-IN"
        ? "Hindi"
        : detectedLanguage === "pa-IN"
          ? "Punjabi"
          : "English"),
    format: nonEmptyStr(varsRaw["format"]) || "Either",
    message: (
      nonEmptyStr(varsRaw["call_summary"]) ||
      nonEmptyStr(varsRaw["message"]) ||
      nonEmptyStr(varsRaw["summary"]) ||
      transcriptSummary ||
      `Inbound helpline call to ${site.phoneDisplay}.`
    ).slice(0, 2000),
    consent: varsRaw["consent"] === true || varsRaw["consent"] === "true",
    resolved_intent: nonEmptyStr(varsRaw["resolved_intent"] ?? varsRaw["customer_intent"]) || kind,
  };

  return {
    id: makeLocalId("srv"),
    interaction_id:
      nonEmptyStr(obj["interaction_id"] ?? obj["call_id"]) ||
      `${nowIso.slice(0, 10).replace(/-/g, "")}/call-${Date.now()}`,
    app_id: nonEmptyStr(obj["app_id"]) || "Conversatio-a5f99753-8f4f",
    deployment_id: nonEmptyStr(obj["deployment_id"]) || "Rabata-inbo-8bb6efed-71ec",
    channel: obj["channel"] === "rabata_web_chatbot" ? "rabata_web_chatbot" : "sarvam_voice_call",
    user_phone_number: callerPhone,
    agent_phone_number:
      nonEmptyStr(obj["agent_phone_number"] ?? obj["bot_contact_identifier"] ?? obj["to"]) ||
      site.phone,
    duration: Number(
      obj["duration_in_seconds"] ??
        obj["duration"] ??
        obj["duration_seconds"] ??
        Math.max(15, transcript.length * 10),
    ),
    status:
      obj["status"] === "missed"
        ? "missed"
        : obj["status"] === "connected"
          ? "connected"
          : obj["status"] === "enrolled"
            ? "enrolled"
            : "completed",
    detected_language: detectedLanguage,
    stt_model: "Saaras v2",
    tts_model: "Bulbul v1",
    llm_model: nonEmptyStr(obj["llm_model"]) || "Rabata Helpline",
    start_datetime: ensureIsoUtc(obj["start_datetime"] ?? obj["started_at"], nowIso),
    end_datetime: ensureIsoUtc(obj["end_datetime"] ?? obj["ended_at"], nowIso),
    output_agent_variables: outputVars,
    interaction_transcript: transcript,
  };
}

export function parseSarvamWebhookPayload(rawJson: string): SarvamCallRecord {
  const obj = JSON.parse(rawJson) as Record<string, unknown>;
  return normalizeSarvamWebhookObject(obj);
}

export function convertEnquiriesToSarvamCalls(enquiries: AdminEnquiryItem[]): SarvamCallRecord[] {
  const results: SarvamCallRecord[] = [];
  for (const enq of enquiries) {
    const d = enq.details;
    const channelRaw = String(d["channel"] ?? "");
    const hasTranscript = Boolean(d["interaction_transcript"] || d["interaction_id"]);
    if (!channelRaw && !hasTranscript) continue;

    let parsedTranscript: SarvamTranscriptTurn[] = [];
    if (typeof d["interaction_transcript"] === "string") {
      try {
        const arr = JSON.parse(d["interaction_transcript"]);
        if (Array.isArray(arr)) parsedTranscript = arr as SarvamTranscriptTurn[];
      } catch {
        // ignore parse failure
      }
    }
    if (parsedTranscript.length === 0 && d["message"]) {
      parsedTranscript = [{ turn_id: 1, role: "user", en_text: d["message"] }];
    }

    const langLabel = String(d["language"] ?? "");
    const detectedLanguage: SarvamCallRecord["detected_language"] = langLabel.includes("Hindi")
      ? "hi-IN"
      : langLabel.includes("Punjabi")
        ? "pa-IN"
        : "en-IN";

    results.push({
      id: enq.id,
      interaction_id: d["interaction_id"] || `db-${enq.id.slice(0, 8)}`,
      app_id: d["app_id"] || "rabata-samvaad-helpline",
      deployment_id: d["deployment_id"] || "rabata-voice-prod-v3",
      channel: channelRaw.toLowerCase().includes("chat")
        ? "rabata_web_chatbot"
        : "sarvam_voice_call",
      user_phone_number: d["caller"] || enq.email,
      agent_phone_number: site.phone,
      duration: Number(d["duration"] || 60),
      status: "completed",
      detected_language: detectedLanguage,
      stt_model: "Saaras v2",
      tts_model: "Bulbul v1",
      llm_model: "Sarvam AI",
      start_datetime: enq.created_at,
      end_datetime: enq.created_at,
      output_agent_variables: {
        kind: enq.kind,
        name: enq.name,
        email: enq.email,
        ...(d["classLevel"] ? { classLevel: d["classLevel"] } : {}),
        ...(d["subjects"] ? { subjects: d["subjects"] } : {}),
        ...(d["language"] ? { language: d["language"] } : {}),
        ...(d["format"] ? { format: d["format"] } : {}),
        message: d["message"] || "",
        consent: enq.consent,
        resolved_intent: enq.kind,
      },
      interaction_transcript: parsedTranscript,
    });
  }
  return results;
}

export type ChatFlowStage =
  | "idle"
  | "student_collect"
  | "student_consent"
  | "volunteer_collect"
  | "volunteer_consent"
  | "contact_collect";

export interface ChatSessionState {
  stage: ChatFlowStage;
  kind: "student" | "volunteer" | "contact";
  guardianConfirmed: boolean;
  name: string;
  email: string;
  classLevel: string;
  subjects: string;
  language: string;
  format: string;
  qualifications: string;
  availability: string;
  message: string;
  consent: boolean;
}

export function createInitialChatSession(lang: AppLanguage): ChatSessionState {
  return {
    stage: "idle",
    kind: "student",
    guardianConfirmed: false,
    name: "",
    email: "",
    classLevel: "",
    subjects: "",
    language: lang === "hi" ? "Hindi" : lang === "pa" ? "Punjabi" : "",
    format: "",
    qualifications: "",
    availability: "",
    message: "",
    consent: false,
  };
}

export function getWelcomeMessageForLanguage(lang: AppLanguage): string {
  if (lang === "hi") {
    return `नमस्ते! राबता सहायता केंद्र में आपका स्वागत है। आप हमारी निःशुल्क कक्षाओं, विषयों, रिकॉर्डेड लेक्चर या फंड पारदर्शिता के बारे में कोई भी प्रश्न पूछ सकते हैं — या छात्र पंजीकरण व स्वयंसेवा शुरू कर सकते हैं। (हेल्पलाइन: ${site.phoneDisplay})`;
  }
  if (lang === "pa") {
    return `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਰਾਬਤਾ ਸਹਾਇਤਾ ਕੇਂਦਰ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਤੁਸੀਂ ਸਾਡੀਆਂ ਮੁਫ਼ਤ ਜਮਾਤਾਂ, ਵਿਸ਼ਿਆਂ ਜਾਂ ਫੰਡ ਪਾਰਦਰਸ਼ਤਾ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛ ਸਕਦੇ ਹੋ — ਜਾਂ ਵਿਦਿਆਰਥੀ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸ਼ੁਰੂ ਕਰ ਸਕਦੇ ਹੋ। (ਹੈਲਪਲਾਈਨ: ${site.phoneDisplay})`;
  }
  return RABATA_SARVAM_FIRST_MESSAGE;
}

function localizedReply(lang: AppLanguage, en: string, hi: string, pa: string): string {
  return lang === "hi" ? hi : lang === "pa" ? pa : en;
}

function answerKnowledgeQuestion(lower: string, lang: AppLanguage): string | null {
  if (/(fee|cost|charge|free|paisa|pay|kitne|मुफ़्त|निःशुल्क|फीस|ਮੁਫ਼ਤ|ਫੀਸ)/.test(lower)) {
    return localizedReply(
      lang,
      "All Rabata education, mentorship, spoken English, computer classes, recorded lectures, and community meals are 100% free of cost. No family is ever charged.",
      "राबता की सभी कक्षाएं, अंग्रेज़ी व कंप्यूटर शिक्षा, रिकॉर्डेड लेक्चर और सामुदायिक भोजन 100% निःशुल्क हैं।",
      "ਰਾਬਤਾ ਦੀਆਂ ਸਾਰੀਆਂ ਜਮਾਤਾਂ, ਅੰਗਰੇਜ਼ੀ ਤੇ ਕੰਪਿਊਟਰ ਸਿਖਲਾਈ ਅਤੇ ਭੋਜਨ ਸੇਵਾ 100% ਮੁਫ਼ਤ ਹੈ।",
    );
  }

  if (/(who founded|tammana|founder|about rabata|about you|tamanna|किसने|तमन्ना|ਤਮੰਨਾ)/.test(lower)) {
    return localizedReply(
      lang,
      `Rabata (राबता) was founded by educator Tammana Rathore in Derabassi, Punjab. We currently guide 10–15 children with direct, individualized mentorship connecting classroom basics, spoken English, computer skills, and career readiness. Follow @rabata._.official or @rathore._.tammana.`,
      `राबता की स्थापना शिक्षिका तमन्ना राठौर ने डेराबस्सी, पंजाब में की। यहाँ लगभग 10–15 बच्चों को व्यक्तिगत मार्गदर्शन, अंग्रेज़ी, कंप्यूटर और करियर कौशल सिखाए जाते हैं।`,
      `ਰਾਬਤਾ ਦੀ ਸ਼ੁਰੂਆਤ ਅਧਿਆਪਕਾ ਤਮੰਨਾ ਰਾਠੌਰ ਨੇ ਡੇਰਾਬੱਸੀ, ਪੰਜਾਬ ਵਿੱਚ ਕੀਤੀ। ਅਸੀਂ 10–15 ਬੱਚਿਆਂ ਨੂੰ ਵਿਅਕਤੀਗਤ ਸਿੱਖਿਆ ਅਤੇ ਕਰੀਅਰ ਮਾਰਗਦਰਸ਼ਨ ਦਿੰਦੇ ਹਾਂ।`,
    );
  }

  if (
    /(where|location|address|derabassi|visit|centre|center|place|timing|time|schedule|कहाँ|पता|समय|ਕਿੱਥੇ|ਸਮਾਂ)/.test(
      lower,
    )
  ) {
    return localizedReply(
      lang,
      `Rabata operates in Derabassi, Punjab (founder's residential learning space) as well as Online. For child safety we don't publish a street address publicly; Tammana coordinates schedules & visits personally after enquiry review. Call our helpline anytime at ${site.phoneDisplay}.`,
      `राबता डेराबस्सी, पंजाब में व्यक्तिगत केंद्र व ऑनलाइन दोनों माध्यमों से पढ़ाता है। बाल सुरक्षा के कारण सटीक घर का पता ऑनलाइन नहीं दिया जाता—पंजीकरण के बाद तमन्ना स्वयं समय तय करती हैं। हेल्पलाइन: ${site.phoneDisplay}`,
      `ਰਾਬਤਾ ਡੇਰਾਬੱਸੀ, ਪੰਜਾਬ ਅਤੇ ਆਨਲਾਈਨ ਦੋਵਾਂ ਤਰੀਕਿਆਂ ਨਾਲ ਪੜ੍ਹਾਉਂਦਾ ਹੈ। ਬਾਲ ਸੁਰੱਖਿਆ ਕਾਰਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਤੋਂ ਬਾਅਦ ਤਮੰਨਾ ਸਮਾਂ ਤੈਅ ਕਰਦੇ ਹਨ। ਹੈਲਪਲਾਈਨ: ${site.phoneDisplay}`,
    );
  }

  if (
    /(what classes|which classes|subjects|teach|curriculum|syllabus|course|program|offer|lecture|quiz|क्या पढ़ा|विषय|कक्षा|ਵਿਸ਼ੇ|ਜਮਾਤਾਂ)/.test(
      lower,
    )
  ) {
    return localizedReply(
      lang,
      `We support Classes 1–12 & Young Adults across Spoken English, Science, Mathematics, Digital Literacy, and Interview/Career Prep. Students can also watch free recorded lectures with interactive 3-question quizzes anytime on our Learn page (/learn).`,
      `हम कक्षा 1–12 व युवा शिक्षार्थियों को स्पोकन अंग्रेज़ी, विज्ञान, गणित, कंप्यूटर और इंटरव्यू तैयारी पढ़ाते हैं। विद्यार्थी हमारे Learn पेज (/learn) पर रिकॉर्डेड लेक्चर व क्विज़ भी देख सकते हैं।`,
      `ਅਸੀਂ ਜਮਾਤ 1–12 ਅਤੇ ਨੌਜਵਾਨਾਂ ਨੂੰ ਸਪੋਕਨ ਅੰਗਰੇਜ਼ੀ, ਵਿਗਿਆਨ, ਗਣਿਤ, ਕੰਪਿਊਟਰ ਅਤੇ ਇੰਟਰਵਿਊ ਤਿਆਰੀ ਕਰਵਾਉਂਦੇ ਹਾਂ। ਤੁਸੀਂ /learn ਪੇਜ ਤੇ ਰਿਕਾਰਡਡ ਲੈਕਚਰ ਤੇ ਕੁਇਜ਼ ਵੀ ਦੇਖ ਸਕਦੇ ਹੋ।`,
    );
  }

  if (
    /(fund|donat|money|receipt|audit|csv|transparent|book|food|meal|फंड|दान|रसीद|ਫੰਡ|ਦਾਨ)/.test(lower)
  ) {
    return localizedReply(
      lang,
      `Every donation and expense is tracked in our Open Fund Transparency Ledger (/funds) with category totals, bill/receipt proofs, and a 1-click Audit CSV download. You can support with books, notebooks, food drives, or educational sponsorships via ${site.email} (never share card/UPI PINs here).`,
      `हर योगदान और खर्च हमारे फंड पारदर्शिता पेज (/funds) पर बिल-रसीद प्रमाण और CSV डाउनलोड के साथ दिखता है। किताबों या भोजन सेवा में मदद हेतु ${site.email} पर लिखें।`,
      `ਹਰ ਦਾਨ ਅਤੇ ਖਰਚ ਦੀ ਜਾਣਕਾਰੀ ਰਸੀਦਾਂ ਤੇ CSV ਡਾਊਨਲੋਡ ਸਮੇਤ /funds ਪੇਜ ਤੇ ਉਪਲਬਧ ਹੈ। ਮਦਦ ਲਈ ${site.email} ਤੇ ਸੰਪਰਕ ਕਰੋ।`,
    );
  }

  if (
    /(report|progress|marks|attendance|qr|student profile|dashboard|प्रोफ़ाइल|रिपोर्ट|ਪ੍ਰੋਫਾਈਲ)/.test(
      lower,
    )
  ) {
    return localizedReply(
      lang,
      `Each enrolled learner gets an individualized Academic Profile (/students) with subject marks, monthly SVG growth graphs, attendance calendars, holistic skill dimensions, and QR-verified printable PDF progress reports.`,
      `प्रत्येक नामांकित छात्र का व्यक्तिगत शैक्षणिक प्रोफ़ाइल (/students) बनता है जिसमें विषय अंक, मासिक प्रगति ग्राफ, उपस्थिति कैलेंडर और QR-सत्यापित PDF रिपोर्ट कार्ड शामिल हैं।`,
      `ਹਰ ਵਿਦਿਆਰਥੀ ਦਾ ਵਿਦਿਅਕ ਪ੍ਰੋਫ਼ਾਈਲ (/students) ਬਣਦਾ ਹੈ ਜਿਸ ਵਿੱਚ ਵਿਸ਼ੇ ਦੇ ਅੰਕ, ਹਾਜ਼ਰੀ ਕੈਲੰਡਰ ਅਤੇ QR-ਤਸਦੀਕਸ਼ੁਦਾ PDF ਰਿਪੋਰਟ ਸ਼ਾਮਲ ਹੈ।`,
    );
  }

  if (
    /(phone|call|helpline|sarvam|voice|contact|email|instagram|फ़ोन|नंबर|हेल्पलाइन|ਫ਼ੋਨ|ਹੈਲਪਲਾਈਨ)/.test(
      lower,
    )
  ) {
    return localizedReply(
      lang,
      `You can call Rabata anytime at ${site.phoneDisplay} (Hindi, Punjabi, or English), email ${site.email}, or follow @rabata._.official on Instagram.`,
      `आप राबता को ${site.phoneDisplay} पर कभी भी कॉल कर सकते हैं (हिंदी, पंजाबी या अंग्रेज़ी), या ${site.email} पर ईमेल कर सकते हैं।`,
      `ਤੁਸੀਂ ਰਾਬਤਾ ਨੂੰ ${site.phoneDisplay} ਤੇ ਕਦੇ ਵੀ ਕਾਲ ਕਰ ਸਕਦੇ ਹੋ (ਹਿੰਦੀ, ਪੰਜਾਬੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ), ਜਾਂ ${site.email} ਤੇ ਈਮੇਲ ਕਰ ਸਕਦੇ ਹੋ।`,
    );
  }

  if (
    /(hello|hi|hey|namaste|sat sri akal|thank|thanks|ok|good|नमस्ते|धन्यवाद|ਸ਼ੁਕਰੀਆ)/.test(lower) &&
    lower.length < 35
  ) {
    return localizedReply(
      lang,
      `Namaste! How can I help you today? You can ask me anything about Rabata's free programs, call ${site.phoneDisplay}, or say "register a student" / "I want to volunteer".`,
      `नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ? आप राबता के कार्यक्रमों के बारे में पूछ सकते हैं या "छात्र पंजीकरण" / "स्वयंसेवक" कहकर शुरुआत कर सकते हैं।`,
      `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਦੱਸੋ ਮੈਂ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ? ਤੁਸੀਂ ਸਾਡੇ ਕੋਰਸਾਂ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ ਜਾਂ "ਵਿਦਿਆਰਥੀ ਰਜਿਸਟ੍ਰੇਸ਼ਨ" ਕਹਿ ਕੇ ਸ਼ੁਰੂ ਕਰ ਸਕਦੇ ਹੋ।`,
    );
  }

  return null;
}

function extractEntities(text: string): Partial<ChatSessionState> {
  const found: Partial<ChatSessionState> = {};

  const emailMatch = text.match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/);
  if (emailMatch) found.email = emailMatch[0].toLowerCase();

  const classMatch = text.match(/\b(1[0-2]|[1-9])(?:st|nd|rd|th)?\b|young\s*adult|कक्षा\s*(\d+)/i);
  if (classMatch) {
    const rawNum = Number(classMatch[1] ?? classMatch[2] ?? 0);
    if (classMatch[0].toLowerCase().includes("young")) found.classLevel = "Young adult";
    else if (rawNum >= 1 && rawNum <= 3) found.classLevel = "1–3";
    else if (rawNum <= 5) found.classLevel = "4–5";
    else if (rawNum <= 8) found.classLevel = "6–8";
    else if (rawNum <= 10) found.classLevel = "9–10";
    else if (rawNum <= 12) found.classLevel = "11–12";
  }

  const subjectsFound: string[] = [];
  if (/english|अंग्रेज़ी|ਅੰਗਰੇਜ਼ੀ/i.test(text)) subjectsFound.push("English");
  if (/math|maths|mathematics|गणित|ਗਣਿਤ/i.test(text)) subjectsFound.push("Mathematics");
  if (/science|विज्ञान|ਵਿਗਿਆਨ/i.test(text)) subjectsFound.push("Science");
  if (/computer|digital|कंप्यूटर|ਕੰਪਿਊਟਰ/i.test(text)) subjectsFound.push("Digital Literacy");
  if (/interview|career|spoken/i.test(text)) subjectsFound.push("Career Readiness");
  if (subjectsFound.length > 0) found.subjects = subjectsFound.join(", ");

  if (/hindi|हिंदी/i.test(text) && /english/i.test(text)) found.language = "Hindi and English";
  else if (/hindi|हिंदी/i.test(text)) found.language = "Hindi";
  else if (/punjabi|ਪੰਜਾਬੀ/i.test(text)) found.language = "Punjabi";
  else if (/english/i.test(text)) found.language = "English";

  if (/online|ऑनलाइन|ਆਨਲਾਈਨ/i.test(text)) found.format = "Online";
  else if (/either|both|दोनों|ਦੋਵੇਂ/i.test(text)) found.format = "Either";
  else if (/in\s*person|offline|derabassi|डेराबस्सी|ऑफलाइन/i.test(text)) found.format = "In person";

  const nameMatch = text.match(
    /(?:my name is|i am|i'm|student name(?: is)?|child(?:'s)? name(?: is)?|son|daughter|name is|मेरा नाम|बच्चे का नाम)\s+([A-Za-z]{2,24})/i,
  );
  if (nameMatch?.[1]) {
    found.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
  }

  if (
    /\b(parent|guardian|mother|father|mom|dad|18\+|adult|माता|पिता|अभिभावक|ਮਾਤਾ|ਪਿਤਾ)\b/i.test(text)
  ) {
    found.guardianConfirmed = true;
  }

  return found;
}

function getNextMissingPrompt(
  s: ChatSessionState,
  lang: AppLanguage,
): { prompt: string; stage: ChatFlowStage } {
  if (s.kind === "volunteer") {
    if (!s.name) {
      return {
        stage: "volunteer_collect",
        prompt: localizedReply(
          lang,
          "What is your full name? (And please confirm you are 18+)",
          "आपका पूरा नाम क्या है? (कृपया यह भी पुष्टि करें कि आप 18+ हैं)",
          "ਤੁਹਾਡਾ ਪੂਰਾ ਨਾਮ ਕੀ ਹੈ? (ਕਿਰਪਾ ਕਰਕੇ ਪੁਸ਼ਟੀ ਕਰੋ ਕਿ ਤੁਸੀਂ 18+ ਹੋ)",
        ),
      };
    }
    if (!s.email) {
      return {
        stage: "volunteer_collect",
        prompt: localizedReply(
          lang,
          `Thank you, ${s.name}! What is your email address?`,
          `धन्यवाद, ${s.name}! आपका ईमेल पता क्या है?`,
          `ਧੰਨਵਾਦ, ${s.name}! ਤੁਹਾਡਾ ਈਮੇਲ ਪਤਾ ਕੀ ਹੈ?`,
        ),
      };
    }
    if (!s.subjects || !s.qualifications) {
      return {
        stage: "volunteer_collect",
        prompt: localizedReply(
          lang,
          "Which subjects can you mentor, and what is your educational background / weekly availability?",
          "आप किन विषयों में पढ़ा सकते हैं, और आपकी योग्यता व उपलब्ध समय क्या है?",
          "ਤੁਸੀਂ ਕਿਹੜੇ ਵਿਸ਼ੇ ਪੜ੍ਹਾ ਸਕਦੇ ਹੋ ਅਤੇ ਤੁਹਾਡੀ ਯੋਗਤਾ ਤੇ ਸਮਾਂ ਕੀ ਹੈ?",
        ),
      };
    }
    return {
      stage: "volunteer_consent",
      prompt: localizedReply(
        lang,
        `Summary: ${s.name} (${s.email}) · Subjects: ${s.subjects}. Do you confirm you are 18+ and consent to Tammana contacting you to review volunteer onboarding? Reply "Yes, I consent" to submit.`,
        `सारांश: ${s.name} (${s.email}) · विषय: ${s.subjects}। क्या आप 18+ हैं और संपर्क की सहमति देते हैं? सबमिट करने के लिए "Yes" लिखें।`,
        `ਸਾਰ: ${s.name} (${s.email}) · ਵਿਸ਼ੇ: ${s.subjects}। ਕੀ ਤੁਸੀਂ ਸੰਪਰਕ ਕਰਨ ਦੀ ਸਹਿਮਤੀ ਦਿੰਦੇ ਹੋ? ਜਮ੍ਹਾਂ ਕਰਨ ਲਈ "Yes" ਲਿਖੋ।`,
      ),
    };
  }

  if (s.kind === "contact") {
    if (!s.name) {
      return {
        stage: "contact_collect",
        prompt: localizedReply(
          lang,
          "What is your name?",
          "कृपया अपना नाम बताएं।",
          "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਨਾਮ ਦੱਸੋ।",
        ),
      };
    }
    if (!s.email) {
      return {
        stage: "contact_collect",
        prompt: localizedReply(
          lang,
          `Thanks ${s.name}! Please share your email and a short note on how you'd like to connect or support.`,
          `धन्यवाद ${s.name}! कृपया अपना ईमेल पता और संदेश लिखें।`,
          `ਧੰਨਵਾਦ ${s.name}! ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਈਮੇਲ ਅਤੇ ਸੁਨੇਹਾ ਲਿਖੋ।`,
        ),
      };
    }
    return {
      stage: "contact_collect",
      prompt: localizedReply(
        lang,
        "Please share your brief message for Tammana Rathore.",
        "कृपया तमन्ना के लिए अपना संदेश लिखें।",
        "ਕਿਰਪਾ ਕਰਕੇ ਤਮੰਨਾ ਲਈ ਆਪਣਾ ਸੁਨੇਹਾ ਲਿਖੋ।",
      ),
    };
  }

  // Student registration flow
  if (!s.name) {
    return {
      stage: "student_collect",
      prompt: localizedReply(
        lang,
        "Let's register the learner! First, what is the student's first name? (For under-18 students, please confirm you are a parent or guardian.)",
        "आइए पंजीकरण शुरू करें! कृपया विद्यार्थी का केवल पहला नाम बताएं (और पुष्टि करें कि आप अभिभावक या 18+ शिक्षार्थी हैं)।",
        "ਆਓ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸ਼ੁਰੂ ਕਰੀਏ! ਕਿਰਪਾ ਕਰਕੇ ਵਿਦਿਆਰਥੀ ਦਾ ਪਹਿਲਾ ਨਾਮ ਦੱਸੋ।",
      ),
    };
  }
  if (!s.email) {
    return {
      stage: "student_collect",
      prompt: localizedReply(
        lang,
        `Noted ${s.name}! What is the parent or guardian's email address?`,
        `धन्यवाद! ${s.name} के माता-पिता या अभिभावक का ईमेल पता लिखें।`,
        `ਧੰਨਵਾਦ! ${s.name} ਦੇ ਮਾਤਾ-ਪਿਤਾ ਜਾਂ ਸਰਪ੍ਰਸਤ ਦਾ ਈਮੇਲ ਪਤਾ ਦੱਸੋ।`,
      ),
    };
  }
  if (!s.classLevel) {
    return {
      stage: "student_collect",
      prompt: localizedReply(
        lang,
        "Which class or grade is the student in? (e.g., Class 5, Class 8, or Young adult)",
        "विद्यार्थी किस कक्षा में पढ़ता है? (जैसे: कक्षा 5, कक्षा 8 या वयस्क)",
        "ਵਿਦਿਆਰਥੀ ਕਿਹੜੀ ਜਮਾਤ ਵਿੱਚ ਹੈ? (ਜਿਵੇਂ: ਜਮਾਤ 5, ਜਮਾਤ 8)",
      ),
    };
  }
  if (!s.subjects) {
    return {
      stage: "student_collect",
      prompt: localizedReply(
        lang,
        "Which subjects or skills would help most (e.g., Spoken English, Mathematics, Science, Computers)?",
        "किन विषयों या कौशलों में मदद चाहिए (जैसे: अंग्रेज़ी, गणित, विज्ञान, कंप्यूटर)?",
        "ਕਿਹੜੇ ਵਿਸ਼ਿਆਂ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ (ਜਿਵੇਂ: ਅੰਗਰੇਜ਼ੀ, ਗਣਿਤ, ਵਿਗਿਆਨ, ਕੰਪਿਊਟਰ)?",
      ),
    };
  }
  return {
    stage: "student_consent",
    prompt: localizedReply(
      lang,
      `Almost done! Summary — Student: ${s.name} · Class: ${s.classLevel} · Subjects: ${s.subjects} · Email: ${s.email}. All classes are 100% free. Do you confirm parent/guardian consent for Tammana to follow up? Reply "Yes, I consent" to submit.`,
      `लगभग पूरा! विद्यार्थी: ${s.name} · कक्षा: ${s.classLevel} · विषय: ${s.subjects} · ईमेल: ${s.email}। क्या आप संपर्क करने की सहमति देते हैं? जमा करने के लिए "Yes" लिखें।`,
      `ਲਗਭਗ ਪੂਰਾ! ਵਿਦਿਆਰਥੀ: ${s.name} · ਜਮਾਤ: ${s.classLevel} · ਵਿਸ਼ੇ: ${s.subjects}। ਕੀ ਤੁਸੀਂ ਸੰਪਰਕ ਦੀ ਸਹਿਮਤੀ ਦਿੰਦੇ ਹੋ? ਜਮ੍ਹਾਂ ਕਰਨ ਲਈ "Yes" ਲਿਖੋ।`,
    ),
  };
}

export function generateRabataAgentReply(
  userInput: string,
  state: ChatSessionState,
  lang: AppLanguage,
): {
  reply: string;
  nextState: ChatSessionState;
  completedEnquiry?: SarvamOutputVariables;
} {
  const trimmed = userInput.trim();
  const lower = trimmed.toLowerCase();

  // 1. Absolute Priority: Safeguarding Emergency & Sensitive PII guardrails
  if (/(danger|abuse|violence|emergency|hurt|unsafe|kidnap|खतरा|आपात|ਖਤਰਾ)/.test(lower)) {
    return {
      reply: localizedReply(
        lang,
        "This assistant is not an emergency service. If a child or person is in immediate danger in India, please dial 112 for Emergency Services or 1098 for Childline India immediately.",
        "यह चैट आपातकालीन सेवा नहीं है। यदि भारत में कोई बच्चा खतरे में है, तो कृपया तुरंत 112 या 1098 (चाइल्डलाइन इंडिया) पर कॉल करें।",
        "ਇਹ ਐਮਰਜੈਂਸੀ ਸੇਵਾ ਨਹੀਂ ਹੈ। ਜੇ ਕੋਈ ਬੱਚਾ ਖ਼ਤਰੇ ਵਿੱਚ ਹੈ, ਤਾਂ ਤੁਰੰਤ 112 ਜਾਂ 1098 (ਚਾਈਲਡਲਾਈਨ) ਤੇ ਕਾਲ ਕਰੋ।",
      ),
      nextState: state,
    };
  }

  if (/(aadhaar|aadhar|pan card|credit card|cvv|otp|upi pin|bank account|आधार)/.test(lower)) {
    return {
      reply: localizedReply(
        lang,
        "For your safety, Rabata never collects Aadhaar numbers, government IDs, bank details, or children's personal phone numbers.",
        "आपकी सुरक्षा के लिए राबता कभी आधार नंबर, पहचान पत्र या बैंक विवरण नहीं मांगता।",
        "ਤੁਹਾਡੀ ਸੁਰੱਖਿਆ ਲਈ ਰਾਬਤਾ ਕਦੇ ਆਧਾਰ ਨੰਬਰ ਜਾਂ ਬੈਂਕ ਵੇਰਵੇ ਨਹੀਂ ਲੈਂਦਾ।",
      ),
      nextState: state,
    };
  }

  // 2. Escape hatch: Allow user to cancel/reset a flow anytime
  if (
    state.stage !== "idle" &&
    /^(cancel|stop|exit|quit|back|reset|never mind|nahi|no thanks|बंद|नहीं)$/i.test(trimmed)
  ) {
    return {
      reply: localizedReply(
        lang,
        `No problem! I've cleared that draft. Feel free to ask any question about Rabata or call ${site.phoneDisplay}.`,
        `कोई बात नहीं! मैंने वह प्रक्रिया रोक दी है। आप कोई भी सवाल पूछ सकते हैं या ${site.phoneDisplay} पर कॉल कर सकते हैं।`,
        `ਕੋਈ ਗੱਲ ਨਹੀਂ! ਤੁਸੀਂ ਰਾਬਤਾ ਬਾਰੇ ਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ ਜਾਂ ${site.phoneDisplay} ਤੇ ਕਾਲ ਕਰ ਸਕਦੇ ਹੋ।`,
      ),
      nextState: createInitialChatSession(lang),
    };
  }

  // 3. Detect genuine informational questions BEFORE triggering or trapping inside flows
  const isQuestionPhrase =
    trimmed.endsWith("?") ||
    /^(what|which|where|who|when|how|why|is |are |do |can |tell me|explain|kya|kaha|kab|kaise|kaun|क्या|कहाँ|कब|कैसे)/i.test(
      lower,
    );
  const entities = extractEntities(trimmed);
  const directAnswer = answerKnowledgeQuestion(lower, lang);

  if (isQuestionPhrase && directAnswer && !entities.email && !entities.name) {
    if (state.stage !== "idle") {
      const nextStep = getNextMissingPrompt(state, lang);
      return {
        reply: `${directAnswer}\n\n${nextStep.prompt}`,
        nextState: state,
      };
    }
    return { reply: directAnswer, nextState: state };
  }

  // 4. Consent confirmation step
  if (state.stage === "student_consent") {
    if (/^(yes|yeah|yep|yup|sure|ok|okay|i consent|agree|confirm|haan|ha|हाँ|जी|ਹਾਂ)/i.test(lower)) {
      const vars: SarvamOutputVariables = {
        kind: "student",
        name: state.name,
        email: state.email,
        classLevel: state.classLevel || "6–8",
        subjects: state.subjects || "General Support",
        language: state.language || "Hindi and English",
        format: state.format || "In person",
        message: `AI Chat Registration — Student: ${state.name}, Class: ${state.classLevel}, Subjects: ${state.subjects}`,
        consent: true,
        resolved_intent: "student_registration",
      };
      return {
        reply: localizedReply(
          lang,
          `Thank you! Registration for ${state.name} has been securely logged for Tammana Rathore to review (all classes remain 100% free; confirmation follows at ${state.email}). You can also call ${site.phoneDisplay} anytime.`,
          `धन्यवाद! ${state.name} का पंजीकरण सुरक्षित रूप से दर्ज हो गया है। तमन्ना जल्द ही ${state.email} पर संपर्क करेंगी।`,
          `ਧੰਨਵਾਦ! ${state.name} ਦੀ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਦਰਜ ਹੋ ਗਈ ਹੈ। ਤਮੰਨਾ ਜਲਦੀ ${state.email} ਤੇ ਸੰਪਰਕ ਕਰਨਗੇ।`,
        ),
        nextState: createInitialChatSession(lang),
        completedEnquiry: vars,
      };
    }
  }

  if (state.stage === "volunteer_consent") {
    if (/^(yes|yeah|yep|yup|sure|ok|okay|i consent|agree|confirm|haan|ha|हाँ|जी|ਹਾਂ)/i.test(lower)) {
      const vars: SarvamOutputVariables = {
        kind: "volunteer",
        name: state.name,
        email: state.email,
        subjects: state.subjects || "General mentorship",
        qualifications: state.qualifications || "Volunteer mentor",
        availability: state.availability || "Flexible",
        format: "Either",
        message: `AI Chat Volunteer Application — ${state.qualifications} | Subjects: ${state.subjects}`,
        consent: true,
        resolved_intent: "volunteer_application",
      };
      return {
        reply: localizedReply(
          lang,
          `Thank you, ${state.name}! Your volunteer application has been logged for Tammana's review at ${site.email}.`,
          `धन्यवाद, ${state.name}! आपका स्वयंसेवक आवेदन सहेज लिया गया है।`,
          `ਧੰਨਵਾਦ, ${state.name}! ਤੁਹਾਡੀ ਵਲੰਟੀਅਰ ਅਰਜ਼ੀ ਦਰਜ ਹੋ ਗਈ ਹੈ।`,
        ),
        nextState: createInitialChatSession(lang),
        completedEnquiry: vars,
      };
    }
  }

  // 5. Explicit intent detection from idle
  if (state.stage === "idle") {
    const wantsStudent =
      /(register|enroll|enrol|admission|join class|sign up my|my son|my daughter|my child|student registration|पंजीकरण|दाखिला|ਵਿਦਿਆਰਥੀ ਰਜਿਸਟ)/.test(
        lower,
      );
    const wantsVolunteer =
      /(i want to volunteer|volunteer|become a mentor|apply to teach|teach with|mentor with|स्वयंसेवा|ਪੜ੍ਹਾਉਣਾ)/.test(
        lower,
      );
    const wantsContact =
      /(donate|support|sponsor|partner|contact tammana|leave a message|donation|दान|संदेश|ਮਦਦ)/.test(
        lower,
      );

    if (wantsVolunteer) {
      const merged: ChatSessionState = { ...state, ...entities, kind: "volunteer" };
      const next = getNextMissingPrompt(merged, lang);
      return { reply: next.prompt, nextState: { ...merged, stage: next.stage } };
    }

    if (wantsContact && !wantsStudent) {
      const merged: ChatSessionState = { ...state, ...entities, kind: "contact" };
      const next = getNextMissingPrompt(merged, lang);
      return { reply: next.prompt, nextState: { ...merged, stage: next.stage } };
    }

    if (wantsStudent) {
      const merged: ChatSessionState = { ...state, ...entities, kind: "student" };
      const next = getNextMissingPrompt(merged, lang);
      return { reply: next.prompt, nextState: { ...merged, stage: next.stage } };
    }

    if (directAnswer) {
      return { reply: directAnswer, nextState: state };
    }

    return {
      reply: localizedReply(
        lang,
        `I can answer questions about Rabata's free programs, recorded lectures (/learn), and open fund ledger (/funds) — or help you register a student, volunteer as a mentor, or send a message. You can also call us at ${site.phoneDisplay}. What would you like to do?`,
        `मैं राबता की निःशुल्क कक्षाओं, रिकॉर्डेड लेक्चर (/learn) और फंड पारदर्शिता (/funds) से जुड़े सवालों के जवाब दे सकता हूँ — या छात्र पंजीकरण व स्वयंसेवा में मदद कर सकता हूँ। हेल्पलाइन: ${site.phoneDisplay}`,
        `ਮੈਂ ਰਾਬਤਾ ਦੀਆਂ ਮੁਫ਼ਤ ਜਮਾਤਾਂ, ਲੈਕਚਰ (/learn) ਅਤੇ ਫੰਡ ਪਾਰਦਰਸ਼ਤਾ (/funds) ਬਾਰੇ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦੇ ਸਕਦਾ ਹਾਂ ਜਾਂ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਹੈਲਪਲਾਈਨ: ${site.phoneDisplay}`,
      ),
      nextState: state,
    };
  }

  // 6. Active guided slot-filling (fill only what was missing without overwriting earlier slots!)
  const updated: ChatSessionState = { ...state };
  if (entities.email && !updated.email) updated.email = entities.email;
  if (entities.classLevel && !updated.classLevel) updated.classLevel = entities.classLevel;
  if (entities.subjects && !updated.subjects) updated.subjects = entities.subjects;
  if (entities.language) updated.language = entities.language;
  if (entities.format) updated.format = entities.format;
  if (entities.guardianConfirmed) updated.guardianConfirmed = true;
  if (entities.name && !updated.name) updated.name = entities.name;

  if (updated.kind === "contact") {
    if (!updated.name && !entities.email) {
      updated.name = trimmed.slice(0, 80);
    } else if (updated.name && updated.email && !updated.message) {
      const vars: SarvamOutputVariables = {
        kind: "contact",
        name: updated.name,
        email: updated.email,
        message: `AI Chat Support/Contact: ${trimmed}`,
        consent: true,
        resolved_intent: "supporter_contact",
      };
      return {
        reply: localizedReply(
          lang,
          `Thank you, ${updated.name}! Your message has been logged for Tammana at ${site.email}. You can also check our Fund Transparency ledger at /funds.`,
          `धन्यवाद, ${updated.name}! आपका संदेश दर्ज कर लिया गया है।`,
          `ਧੰਨਵਾਦ, ${updated.name}! ਤੁਹਾਡਾ ਸੁਨੇਹਾ ਦਰਜ ਕਰ ਲਿਆ ਗਿਆ ਹੈ।`,
        ),
        nextState: createInitialChatSession(lang),
        completedEnquiry: vars,
      };
    }
    const next = getNextMissingPrompt(updated, lang);
    return { reply: next.prompt, nextState: { ...updated, stage: next.stage } };
  }

  if (updated.kind === "volunteer") {
    if (!updated.name && trimmed.length <= 45 && !entities.email && !isQuestionPhrase) {
      updated.name =
        trimmed.replace(/\b(yes|i am 18\+|18\+|confirm|my name is)\b/gi, "").trim() || trimmed;
    } else if (updated.name && updated.email && (!updated.subjects || !updated.qualifications)) {
      updated.qualifications = trimmed.slice(0, 290);
      updated.subjects = entities.subjects || trimmed.slice(0, 180);
      updated.availability = trimmed.slice(0, 180);
    }
    const next = getNextMissingPrompt(updated, lang);
    return { reply: next.prompt, nextState: { ...updated, stage: next.stage } };
  }

  // Student slot filler
  if (
    !updated.name &&
    !entities.email &&
    !isQuestionPhrase &&
    !/^(yes|haan|ha|हाँ|ਹਾਂ)$/i.test(trimmed)
  ) {
    updated.name = trimmed.slice(0, 60);
  } else if (updated.name && updated.email && !updated.classLevel && !isQuestionPhrase) {
    updated.classLevel = trimmed.slice(0, 30);
  } else if (
    updated.name &&
    updated.email &&
    updated.classLevel &&
    !updated.subjects &&
    !isQuestionPhrase
  ) {
    updated.subjects = trimmed.slice(0, 180);
  }

  const next = getNextMissingPrompt(updated, lang);
  return { reply: next.prompt, nextState: { ...updated, stage: next.stage } };
}
