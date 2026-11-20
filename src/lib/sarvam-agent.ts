import type { AppLanguage } from "./i18n";
import { makeLocalId } from "./local-store";
import { site } from "./site";

export const RABATA_SARVAM_FIRST_MESSAGE =
  "Namaste! Welcome to Rabata — Connecting Education with Opportunity. I’m Rabata’s virtual assistant. Are you here to register a student for free classes, volunteer as a mentor, or support our community initiatives?";

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
2. Collect One by One:
   - Student's first name (first name only)
   - Parent / guardian email (and callback phone if over phone)
   - Class / grade level (1–3, 4–5, 6–8, 9–10, 11–12, or Young adult)
   - Subjects or skills needed
   - Preferred language (Hindi, English, Punjabi, or Hindi and English)
   - Preferred format (In person, Online, or Either)
   - Learning goals / support needed
   - Explicit consent to store details for follow-up

## Flow 2: Volunteer Teacher or Mentor Enquiry
1. Confirm 18+ eligibility and note that volunteer applications are reviewed before teaching begins.
2. Collect full name, email, qualifications, subjects/classes, languages, availability, experience, motivation, and consent.

## Flow 3: Donations, Learning Materials, Food Drives, or Partnerships
1. Explain support options (books, notebooks, digital equipment, food drives, career workshops).
2. Highlight Open Fund Transparency (/funds) showing received totals, allocations, expenditures, and receipt/bill proofs.
3. Never ask for credit card numbers, UPI PINs, or bank credentials. Collect supporter name, email, and contribution idea.

# Strict Child Safeguarding, Privacy & Safety Rules
1. Never collect Aadhaar numbers, government IDs, a child's personal mobile number, home address, or financial credentials.
2. Never share private details of any Rabata student or mentor.
3. Never invent unverified statistics or job placement guarantees (Rabata supports ~10–15 children with direct individual attention).
4. Emergency Protocol: If someone reports a child in immediate danger in India, immediately direct them to dial 112 (Emergency) or 1098 (Childline India).

# End-of-Call Summary Output (Matched to enquirySchema)
Output structured variables: kind ("student" | "volunteer" | "contact"), name, email, phone, classLevel, subjects, language, format, qualifications, experience, availability, message, consent.`;

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
    llm_model: "Sarvam-M",
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
    llm_model: "Sarvam-M",
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
    llm_model: "Sarvam-M",
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

const SARVAM_CALLS_STORAGE_KEY = "rabata_sarvam_calls_v1";

export function readSarvamCalls(): SarvamCallRecord[] {
  if (typeof window === "undefined") return SEEDED_SARVAM_CALLS;
  try {
    const raw = window.localStorage.getItem(SARVAM_CALLS_STORAGE_KEY);
    if (!raw) return SEEDED_SARVAM_CALLS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as SarvamCallRecord[];
    }
  } catch {
    // fallback to seed
  }
  return SEEDED_SARVAM_CALLS;
}

export function writeSarvamCalls(calls: SarvamCallRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SARVAM_CALLS_STORAGE_KEY, JSON.stringify(calls.slice(0, 60)));
  } catch {
    // ignore quota issues
  }
}

export function prependSarvamCall(call: SarvamCallRecord): SarvamCallRecord[] {
  const existing = readSarvamCalls().filter((c) => c.id !== call.id);
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

export function parseSarvamWebhookPayload(rawJson: string): SarvamCallRecord {
  const obj = JSON.parse(rawJson) as Record<string, unknown>;
  const varsRaw =
    obj["output_agent_variables"] &&
    typeof obj["output_agent_variables"] === "object" &&
    !Array.isArray(obj["output_agent_variables"])
      ? (obj["output_agent_variables"] as Record<string, unknown>)
      : {};

  const rawTranscript = Array.isArray(obj["interaction_transcript"])
    ? (obj["interaction_transcript"] as Array<Record<string, unknown>>)
    : [];

  const transcript: SarvamTranscriptTurn[] = rawTranscript.map((turn, idx) => {
    const t: SarvamTranscriptTurn = {
      turn_id: typeof turn["turn_id"] === "number" ? turn["turn_id"] : idx + 1,
      role: turn["role"] === "user" ? "user" : "agent",
      en_text: String(turn["en_text"] ?? turn["indic_text"] ?? ""),
    };
    if (typeof turn["indic_text"] === "string" && turn["indic_text"].trim()) {
      t.indic_text = turn["indic_text"];
    }
    return t;
  });

  const rawKind = String(varsRaw["kind"] ?? "student");
  const kind: SarvamOutputVariables["kind"] =
    rawKind === "volunteer" ? "volunteer" : rawKind === "contact" ? "contact" : "student";

  const langHint = JSON.stringify(transcript);
  const detectedLanguage: SarvamCallRecord["detected_language"] = /[\u0900-\u097F]/.test(langHint)
    ? "hi-IN"
    : /[\u0A00-\u0A7F]/.test(langHint)
      ? "pa-IN"
      : "en-IN";

  const nowIso = new Date().toISOString();
  const transcriptSummary = transcript
    .filter((t) => t.role === "user")
    .map((t) => t.en_text)
    .join(" | ");

  const outputVars: SarvamOutputVariables = {
    kind,
    name: String(varsRaw["name"] ?? varsRaw["student_name"] ?? "Caller"),
    email: String(varsRaw["email"] ?? "voice.caller@example.com"),
    classLevel: String(varsRaw["classLevel"] ?? varsRaw["class_level"] ?? "6–8"),
    subjects: String(varsRaw["subjects"] ?? "English, Mathematics"),
    language: String(
      varsRaw["language"] ??
        (detectedLanguage === "hi-IN"
          ? "Hindi"
          : detectedLanguage === "pa-IN"
            ? "Punjabi"
            : "English"),
    ),
    format: String(varsRaw["format"] ?? "In person"),
    message: String(
      varsRaw["message"] ??
        (transcriptSummary || "Inbound Sarvam AI Samvaad voice call logged via webhook."),
    ),
    consent: varsRaw["consent"] !== false,
    resolved_intent: String(varsRaw["resolved_intent"] ?? varsRaw["customer_intent"] ?? kind),
  };

  return {
    id: makeLocalId("srv"),
    interaction_id: String(
      obj["interaction_id"] ??
        `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}/samvaad-${Date.now()}`,
    ),
    app_id: String(obj["app_id"] ?? "rabata-samvaad-helpline"),
    deployment_id: String(obj["deployment_id"] ?? "rabata-voice-prod-v3"),
    channel: "sarvam_voice_call",
    user_phone_number: String(obj["user_phone_number"] ?? "+9198XXXXXXXX"),
    agent_phone_number: String(obj["agent_phone_number"] ?? site.phone),
    duration: Number(obj["duration"] ?? Math.max(25, transcript.length * 16)),
    status:
      obj["status"] === "missed"
        ? "missed"
        : obj["status"] === "connected"
          ? "connected"
          : "completed",
    detected_language: detectedLanguage,
    stt_model: "Saaras v2",
    tts_model: "Bulbul v1",
    llm_model: "Sarvam-M",
    start_datetime: String(obj["start_datetime"] ?? nowIso),
    end_datetime: String(obj["end_datetime"] ?? nowIso),
    output_agent_variables: outputVars,
    interaction_transcript: transcript,
  };
}

export type ChatFlowStage =
  | "idle"
  | "student_guardian_check"
  | "student_name"
  | "student_email"
  | "student_class"
  | "student_subjects"
  | "student_language"
  | "student_format"
  | "student_consent"
  | "volunteer_age_check"
  | "volunteer_name"
  | "volunteer_email"
  | "volunteer_qualifications"
  | "volunteer_subjects"
  | "volunteer_availability"
  | "volunteer_consent"
  | "contact_name"
  | "contact_email"
  | "contact_message"
  | "contact_consent";

export interface ChatSessionState {
  stage: ChatFlowStage;
  kind: "student" | "volunteer" | "contact";
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
    name: "",
    email: "",
    classLevel: "6–8",
    subjects: "Spoken English, Mathematics",
    language: lang === "hi" ? "Hindi" : lang === "pa" ? "Punjabi" : "Hindi and English",
    format: "In person",
    qualifications: "",
    availability: "",
    message: "",
    consent: false,
  };
}

export function getWelcomeMessageForLanguage(lang: AppLanguage): string {
  if (lang === "hi") {
    return "नमस्ते! राबता AI सहायक में आपका स्वागत है। क्या आप निःशुल्क कक्षाओं के लिए छात्र पंजीकरण करना चाहते हैं, शिक्षक/मेंटर के रूप में जुड़ना चाहते हैं, या हमारी पारदर्शी फंड व्यवस्था के बारे में जानना चाहते हैं? (कॉल के लिए: +91 79654 81661)";
  }
  if (lang === "pa") {
    return "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਰਾਬਤਾ AI ਸਹਾਇਕ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਕੀ ਤੁਸੀਂ ਮੁਫ਼ਤ ਜਮਾਤਾਂ ਲਈ ਵਿਦਿਆਰਥੀ ਰਜਿਸਟਰ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ, ਵਲੰਟੀਅਰ ਅਧਿਆਪਕ ਬਣਨਾ ਚਾਹੁੰਦੇ ਹੋ, ਜਾਂ ਫੰਡ ਪਾਰਦਰਸ਼ਤਾ ਬਾਰੇ ਪੁੱਛਣਾ ਚਾਹੁੰਦੇ ਹੋ? (ਫ਼ੋਨ ਹੈਲਪਲਾਈਨ: +91 79654 81661)";
  }
  return RABATA_SARVAM_FIRST_MESSAGE;
}

function localizedReply(lang: AppLanguage, en: string, hi: string, pa: string): string {
  return lang === "hi" ? hi : lang === "pa" ? pa : en;
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

  // Emergency safeguarding rule from System Prompt (takes absolute priority)
  if (
    /(danger|abuse|violence|emergency|hurt|harass|unsafe|kidnap|खतरा|आपात|ਮਦਦ|ਖਤਰਾ)/.test(lower)
  ) {
    return {
      reply: localizedReply(
        lang,
        "This assistant is not an emergency service. If a child or person is in immediate danger in India, please dial 112 for Emergency Services or 1098 for Childline India immediately.",
        "यह चैट एक आपातकालीन सेवा नहीं है। यदि भारत में कोई बच्चा या व्यक्ति तत्काल खतरे में है, तो कृपया तुरंत 112 (आपातकालीन सेवा) या 1098 (चाइल्डलाइन इंडिया) पर कॉल करें।",
        "ਇਹ ਸਹਾਇਕ ਐਮਰਜੈਂਸੀ ਸੇਵਾ ਨਹੀਂ ਹੈ। ਜੇ ਭਾਰਤ ਵਿੱਚ ਕੋਈ ਬੱਚਾ ਤੁਰੰਤ ਖ਼ਤਰੇ ਵਿੱਚ ਹੈ, ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ 112 ਜਾਂ 1098 (ਚਾਈਲਡਲਾਈਨ) ਤੇ ਕਾਲ ਕਰੋ।",
      ),
      nextState: state,
    };
  }

  // Handle mid-flow safeguarding checks against sensitive docs / bank data
  if (/(aadhaar|aadhar|pan card|credit card|cvv|otp|upi pin|bank account|आधार)/.test(lower)) {
    return {
      reply: localizedReply(
        lang,
        "For your safety, Rabata never collects Aadhaar numbers, government IDs, bank details, or children's personal phone numbers. Let's continue with just basic learning details!",
        "आपकी सुरक्षा के लिए राबता कभी भी आधार नंबर, पहचान पत्र, बैंक विवरण या बच्चों के व्यक्तिगत फ़ोन नंबर नहीं मांगता। आइए केवल बुनियादी पढ़ाई की जानकारी साझा करें।",
        "ਤੁਹਾਡੀ ਸੁਰੱਖਿਆ ਲਈ ਰਾਬਤਾ ਕਦੇ ਵੀ ਆਧਾਰ ਨੰਬਰ, ਬੈਂਕ ਵੇਰਵੇ ਜਾਂ ਬੱਚੇ ਦਾ ਨਿੱਜੀ ਫ਼ੋਨ ਨੰਬਰ ਨਹੀਂ ਲੈਂਦਾ। ਆਓ ਸਿਰਫ਼ ਪੜ੍ਹਾਈ ਦੀ ਬੁਨਿਆਦੀ ਜਾਣਕਾਰੀ ਸਾਂਝੀ ਕਰੀਏ।",
      ),
      nextState: state,
    };
  }

  // Start guided flows from idle or explicit restart keywords
  if (state.stage === "idle") {
    if (
      /(register|student|child|admission|enroll|class|study|पंजीकरण|छात्र|दाखिला|ਵਿਦਿਆਰਥੀ|ਦਾਖਲਾ)/.test(
        lower,
      )
    ) {
      return {
        reply: localizedReply(
          lang,
          "I’d love to help register a learner for Rabata's 100% free classes! First, for child safety: are you a parent/legal guardian (or an adult learner 18+)? Please reply 'Yes' to begin.",
          "मैं निःशुल्क कक्षाओं के लिए पंजीकरण में खुशी से मदद करूँगा! बाल सुरक्षा के तहत, क्या आप माता-पिता/अभिभावक (या 18+ वयस्क शिक्षार्थी) हैं? शुरू करने के लिए 'हाँ' लिखें।",
          "ਮੈਂ ਮੁਫ਼ਤ ਜਮਾਤਾਂ ਲਈ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ! ਬਾਲ ਸੁਰੱਖਿਆ ਲਈ, ਕੀ ਤੁਸੀਂ ਮਾਤਾ-ਪਿਤਾ/ਸਰਪ੍ਰਸਤ (ਜਾਂ 18+ ਵਿਦਿਆਰਥੀ) ਹੋ? ਸ਼ੁਰੂ ਕਰਨ ਲਈ 'ਹਾਂ' ਲਿਖੋ।",
        ),
        nextState: { ...state, stage: "student_guardian_check", kind: "student" },
      };
    }

    if (/(volunteer|mentor|teach|teacher|शिक्षक|स्वयंसेवा|पढ़ा|ਅਧਿਆਪਕ|ਵਲੰਟੀਅਰ)/.test(lower)) {
      return {
        reply: localizedReply(
          lang,
          "Thank you for wanting to mentor with Rabata! Both experienced teachers and new volunteers are welcome. First, please confirm you are 18 or older ('Yes' to continue).",
          "राबता के साथ जुड़कर पढ़ाने की इच्छा के लिए धन्यवाद! अनुभवी व नए दोनों स्वयंसेवकों का स्वागत है। पहले कृपया पुष्टि करें कि आपकी आयु 18 वर्ष या उससे अधिक है ('हाँ' लिखें)।",
          "ਰਾਬਤਾ ਨਾਲ ਵਲੰਟੀਅਰ ਵਜੋਂ ਜੁੜਨ ਲਈ ਧੰਨਵਾਦ! ਪਹਿਲਾਂ ਕਿਰਪਾ ਕਰਕੇ ਪੁਸ਼ਟੀ ਕਰੋ ਕਿ ਤੁਹਾਡੀ ਉਮਰ 18 ਸਾਲ ਜਾਂ ਵੱਧ ਹੈ ('ਹਾਂ' ਲਿਖੋ)।",
        ),
        nextState: { ...state, stage: "volunteer_age_check", kind: "volunteer" },
      };
    }

    if (
      /(donat|fund|money|money|ledger|transparent|support|food|partner|दान|फंड|सहयोग|ਮਦਦ|ਫੰਡ)/.test(
        lower,
      )
    ) {
      return {
        reply: localizedReply(
          lang,
          `You can support Rabata with books, notebooks, food drives, or digital gear — and inspect every rupee with receipt proofs on our Fund Transparency page (/funds). Want Tammana to reach out? Reply with your name to leave a quick supporter note (never share card/UPI PINs).`,
          `आप किताबों, कॉपियों, भोजन अभियान या डिजिटल संसाधनों से राबता का सहयोग कर सकते हैं और हमारे फंड पारदर्शिता पेज (/funds) पर हर खर्च की रसीद देख सकते हैं। यदि आप जुड़ना चाहते हैं तो अपना नाम लिखें (कृपया कार्ड/UPI पिन साझा न करें)।`,
          `ਤੁਸੀਂ ਕਿਤਾਬਾਂ, ਕਾਪੀਆਂ ਜਾਂ ਭੋਜਨ ਸੇਵਾ ਰਾਹੀਂ ਮਦਦ ਕਰ ਸਕਦੇ ਹੋ ਅਤੇ /funds ਪੇਜ ਤੇ ਹਰ ਖਰਚ ਦੀ ਰਸੀਦ ਦੇਖ ਸਕਦੇ ਹੋ। ਜੇ ਤੁਸੀਂ ਸੰਪਰਕ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ ਤਾਂ ਆਪਣਾ ਨਾਮ ਦੱਸੋ।`,
        ),
        nextState: { ...state, stage: "contact_email", kind: "contact" },
      };
    }

    if (
      /(phone|call|number|helpline|sarvam|address|location|derabassi|फ़ोन|नंबर|पता|ਫ਼ੋਨ|ਪਤਾ)/.test(
        lower,
      )
    ) {
      return {
        reply: localizedReply(
          lang,
          `You can reach Rabata's 24x7 Multilingual Sarvam AI Voice Helpline anytime at ${site.phoneDisplay} (${site.phone}) in Hindi, Punjabi, or English, or email ${site.email}. In-person classes take place in Derabassi, Punjab; visits are scheduled personally by Tammana Rathore after registration for safeguarding.`,
          `आप राबता की 24x7 बहुभाषी Sarvam AI हेल्पलाइन ${site.phoneDisplay} पर कभी भी हिंदी, पंजाबी या अंग्रेज़ी में कॉल कर सकते हैं, या ${site.email} पर ईमेल कर सकते हैं। डेराबस्सी केंद्र में मुलाकात पंजीकरण समीक्षा के बाद तमन्ना द्वारा तय की जाती है।`,
          `ਤੁਸੀਂ ਰਾਬਤਾ ਦੀ Sarvam AI ਹੈਲਪਲਾਈਨ ${site.phoneDisplay} ਤੇ ਹਿੰਦੀ, ਪੰਜਾਬੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਕਦੇ ਵੀ ਕਾਲ ਕਰ ਸਕਦੇ ਹੋ, ਜਾਂ ${site.email} ਤੇ ਈਮੇਲ ਕਰ ਸਕਦੇ ਹੋ।`,
        ),
        nextState: state,
      };
    }

    return {
      reply: localizedReply(
        lang,
        `Rabata offers 100% free Spoken English, Maths, Science, Digital Literacy, Career Interview prep, and Recorded Lectures (/learn) in Derabassi & online. Type "register student", "volunteer", or "donate/contact" — or call our Sarvam AI Voice Helpline anytime at ${site.phoneDisplay}!`,
        `राबता डेराबस्सी व ऑनलाइन माध्यम से निःशुल्क अंग्रेज़ी, गणित, विज्ञान, कंप्यूटर, करियर मार्गदर्शन और रिकॉर्डेड लेक्चर (/learn) प्रदान करता है। शुरू करने के लिए "register student", "volunteer", या "contact" लिखें — या ${site.phoneDisplay} पर कॉल करें!`,
        `ਰਾਬਤਾ ਡੇਰਾਬੱਸੀ ਅਤੇ ਆਨਲਾਈਨ ਰਾਹੀਂ ਮੁਫ਼ਤ ਅੰਗਰੇਜ਼ੀ, ਗਣਿਤ, ਵਿਗਿਆਨ, ਕੰਪਿਊਟਰ ਅਤੇ ਕਰੀਅਰ ਮਦਦ ਦਿੰਦਾ ਹੈ। "register student", "volunteer" ਜਾਂ "contact" ਲਿਖੋ — ਜਾਂ ${site.phoneDisplay} ਤੇ ਕਾਲ ਕਰੋ!`,
      ),
      nextState: state,
    };
  }

  // Student Registration Flow
  if (state.stage === "student_guardian_check") {
    return {
      reply: localizedReply(
        lang,
        "Thank you. What is the student's first name? (First name only, please.)",
        "धन्यवाद। कृपया विद्यार्थी का केवल पहला नाम बताएं।",
        "ਧੰਨਵਾਦ। ਕਿਰਪਾ ਕਰਕੇ ਵਿਦਿਆਰਥੀ ਦਾ ਸਿਰਫ਼ ਪਹਿਲਾ ਨਾਮ ਦੱਸੋ।",
      ),
      nextState: { ...state, stage: "student_name" },
    };
  }

  if (state.stage === "student_name") {
    return {
      reply: localizedReply(
        lang,
        `Great, noting ${trimmed}! What is the parent or guardian's contact email address?`,
        `बढ़िया! अब माता-पिता या अभिभावक का ईमेल पता लिखें।`,
        `ਬਹੁਤ ਵਧੀਆ! ਹੁਣ ਮਾਤਾ-ਪਿਤਾ ਜਾਂ ਸਰਪ੍ਰਸਤ ਦਾ ਈਮੇਲ ਪਤਾ ਦੱਸੋ।`,
      ),
      nextState: { ...state, name: trimmed.slice(0, 100), stage: "student_email" },
    };
  }

  if (state.stage === "student_email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return {
        reply: localizedReply(
          lang,
          "Please share a valid email address (for example: name@example.com) so Tammana can reply safely.",
          "कृपया एक सही ईमेल पता लिखें (जैसे: name@example.com) ताकि तमन्ना आपसे संपर्क कर सकें।",
          "ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਈਮੇਲ ਪਤਾ ਲਿਖੋ (ਜਿਵੇਂ: name@example.com)।",
        ),
        nextState: state,
      };
    }
    return {
      reply: localizedReply(
        lang,
        "Got it! Which class or grade level is the student in? (e.g., 1–3, 4–5, 6–8, 9–10, 11–12, or Young adult)",
        "ठीक है! विद्यार्थी किस कक्षा में पढ़ता है? (जैसे: 1–3, 4–5, 6–8, 9–10, 11–12 या वयस्क)",
        "ਠੀਕ ਹੈ! ਵਿਦਿਆਰਥੀ ਕਿਹੜੀ ਜਮਾਤ ਵਿੱਚ ਹੈ? (ਜਿਵੇਂ: 1–3, 4–5, 6–8, 9–10, 11–12)",
      ),
      nextState: { ...state, email: trimmed.toLowerCase(), stage: "student_class" },
    };
  }

  if (state.stage === "student_class") {
    return {
      reply: localizedReply(
        lang,
        "Which subjects or skills would help most? (e.g., Spoken English, Mathematics, Science, Computer basics)",
        "विद्यार्थी को किन विषयों या कौशलों में मदद चाहिए? (जैसे: अंग्रेज़ी, गणित, विज्ञान, कंप्यूटर)",
        "ਕਿਹੜੇ ਵਿਸ਼ਿਆਂ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ? (ਜਿਵੇਂ: ਅੰਗਰੇਜ਼ੀ, ਗਣਿਤ, ਵਿਗਿਆਨ, ਕੰਪਿਊਟਰ)",
      ),
      nextState: { ...state, classLevel: trimmed.slice(0, 30), stage: "student_subjects" },
    };
  }

  if (state.stage === "student_subjects") {
    return {
      reply: localizedReply(
        lang,
        "Preferred teaching language & format? (e.g., Hindi & English, In person in Derabassi or Online)",
        "पसंदीदा भाषा और माध्यम बताएं (जैसे: हिंदी/अंग्रेज़ी, डेराबस्सी में ऑफलाइन या ऑनलाइन)?",
        "ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ ਅਤੇ ਤਰੀਕਾ ਦੱਸੋ (ਜਿਵੇਂ: ਪੰਜਾਬੀ/ਹਿੰਦੀ, ਡੇਰਾਬੱਸੀ ਆਫਲਾਈਨ ਜਾਂ ਆਨਲਾਈਨ)?",
      ),
      nextState: { ...state, subjects: trimmed.slice(0, 200), stage: "student_format" },
    };
  }

  if (state.stage === "student_format") {
    const inferredFormat = /online|ऑनलाइन|ਆਨਲਾਈਨ/i.test(trimmed)
      ? "Online"
      : /either|any|दोनों|ਦੋਵੇਂ/i.test(trimmed)
        ? "Either"
        : "In person";
    return {
      reply: localizedReply(
        lang,
        `Almost done! Summary for ${state.name}: Class ${state.classLevel}, Subjects: ${state.subjects}, Format: ${inferredFormat}. Do you consent to Rabata storing this enquiry so Tammana can contact ${state.email} about availability? Reply "Yes, I consent" to submit.`,
        `लगभग पूरा! विद्यार्थी: ${state.name}, कक्षा: ${state.classLevel}, विषय: ${state.subjects}। क्या आप सहमति देते हैं कि राबता यह जानकारी सहेजे ताकि तमन्ना ${state.email} पर संपर्क करें? जमा करने के लिए "Yes" या "हाँ" लिखें।`,
        `ਲਗਭਗ ਪੂਰਾ! ਵਿਦਿਆਰਥੀ: ${state.name}, ਜਮਾਤ: ${state.classLevel}, ਵਿਸ਼ੇ: ${state.subjects}। ਕੀ ਤੁਸੀਂ ${state.email} ਤੇ ਸੰਪਰਕ ਕਰਨ ਦੀ ਸਹਿਮਤੀ ਦਿੰਦੇ ਹੋ? ਜਮ੍ਹਾਂ ਕਰਨ ਲਈ "Yes" ਜਾਂ "ਹਾਂ" ਲਿਖੋ।`,
      ),
      nextState: {
        ...state,
        format: inferredFormat,
        message: `AI Chat Student Registration — Student: ${state.name}, Class: ${state.classLevel}, Subjects: ${state.subjects}, Preference noted: ${trimmed}`,
        stage: "student_consent",
      },
    };
  }

  if (state.stage === "student_consent") {
    const vars: SarvamOutputVariables = {
      kind: "student",
      name: state.name,
      email: state.email,
      classLevel: state.classLevel,
      subjects: state.subjects,
      language: state.language,
      format: state.format,
      message: state.message,
      consent: true,
      resolved_intent: "student_registration",
    };
    return {
      reply: localizedReply(
        lang,
        `Thank you! Registration for ${state.name} has been securely logged for Tammana Rathore to review (All classes remain 100% free; confirmation follows shortly). Feel free to call ${site.phoneDisplay} anytime!`,
        `धन्यवाद! ${state.name} का पंजीकरण सुरक्षित रूप से दर्ज हो गया है। तमन्ना जल्द ही ${state.email} पर आपसे संपर्क करेंगी (सभी कक्षाएं 100% निःशुल्क हैं)। आप ${site.phoneDisplay} पर भी कॉल कर सकते हैं!`,
        `ਧੰਨਵਾਦ! ${state.name} ਦੀ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸੁਰੱਖਿਅਤ ਢੰਗ ਨਾਲ ਦਰਜ ਹੋ ਗਈ ਹੈ। ਤਮੰਨਾ ਜਲਦੀ ਹੀ ${state.email} ਤੇ ਸੰਪਰਕ ਕਰਨਗੇ।`,
      ),
      nextState: createInitialChatSession(lang),
      completedEnquiry: vars,
    };
  }

  // Volunteer Flow
  if (state.stage === "volunteer_age_check") {
    return {
      reply: localizedReply(
        lang,
        "Wonderful! What is your full name?",
        "बहुत अच्छा! कृपया अपना पूरा नाम लिखें।",
        "ਬਹੁਤ ਵਧੀਆ! ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਲਿਖੋ।",
      ),
      nextState: { ...state, stage: "volunteer_name" },
    };
  }

  if (state.stage === "volunteer_name") {
    return {
      reply: localizedReply(
        lang,
        `Nice to meet you, ${trimmed}! What is your email address?`,
        `आपसे मिलकर खुशी हुई, ${trimmed}! कृपया अपना ईमेल पता लिखें।`,
        `ਤੁਹਾਨੂੰ ਮਿਲ ਕੇ ਖੁਸ਼ੀ ਹੋਈ, ${trimmed}! ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਈਮੇਲ ਪਤਾ ਦੱਸੋ।`,
      ),
      nextState: { ...state, name: trimmed.slice(0, 100), stage: "volunteer_email" },
    };
  }

  if (state.stage === "volunteer_email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return {
        reply: localizedReply(
          lang,
          "Please provide a valid email address so Rabata can respond.",
          "कृपया एक मान्य ईमेल पता दर्ज करें।",
          "ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਈਮੇਲ ਪਤਾ ਲਿਖੋ।",
        ),
        nextState: state,
      };
    }
    return {
      reply: localizedReply(
        lang,
        "What are your qualifications and which subjects/classes can you mentor?",
        "आपकी शैक्षणिक योग्यता क्या है और आप कौन से विषय व कक्षाएं पढ़ा सकते हैं?",
        "ਤੁਹਾਡੀ ਯੋਗਤਾ ਕੀ ਹੈ ਅਤੇ ਤੁਸੀਂ ਕਿਹੜੇ ਵਿਸ਼ੇ ਪੜ੍ਹਾ ਸਕਦੇ ਹੋ?",
      ),
      nextState: { ...state, email: trimmed.toLowerCase(), stage: "volunteer_qualifications" },
    };
  }

  if (state.stage === "volunteer_qualifications") {
    return {
      reply: localizedReply(
        lang,
        "What weekly days/hours work for you, and do you agree to Rabata contacting you regarding volunteer onboarding? Reply with your availability and 'Yes'.",
        "आप सप्ताह में किस समय पढ़ा सकते हैं और क्या आप संपर्क की सहमति देते हैं?",
        "ਤੁਸੀਂ ਹਫ਼ਤੇ ਵਿੱਚ ਕਿਹੜੇ ਦਿਨ ਪੜ੍ਹਾ ਸਕਦੇ ਹੋ? ਕਿਰਪਾ ਕਰਕੇ ਸਹਿਮਤੀ ਲਈ 'Yes' ਨਾਲ ਲਿਖੋ।",
      ),
      nextState: {
        ...state,
        qualifications: trimmed.slice(0, 290),
        subjects: trimmed.slice(0, 180),
        stage: "volunteer_consent",
      },
    };
  }

  if (state.stage === "volunteer_consent") {
    const vars: SarvamOutputVariables = {
      kind: "volunteer",
      name: state.name,
      email: state.email,
      subjects: state.subjects || "General mentorship",
      qualifications: state.qualifications || "College / community volunteer",
      availability: trimmed.slice(0, 190),
      format: "Either",
      message: `AI Chat Volunteer Application — Qualifications & Subjects: ${state.qualifications}. Availability: ${trimmed}`,
      consent: true,
      resolved_intent: "volunteer_application",
    };
    return {
      reply: localizedReply(
        lang,
        `Thank you, ${state.name}! Your volunteer mentor application is saved and sent for Tammana's review at ${site.email}.`,
        `धन्यवाद, ${state.name}! आपका स्वयंसेवक आवेदन सहेज लिया गया है और तमन्ना की समीक्षा के लिए भेज दिया गया है।`,
        `ਧੰਨਵਾਦ, ${state.name}! ਤੁਹਾਡੀ ਵਲੰਟੀਅਰ ਅਰਜ਼ੀ ਸੁਰੱਖਿਅਤ ਢੰਗ ਨਾਲ ਦਰਜ ਹੋ ਗਈ ਹੈ।`,
      ),
      nextState: createInitialChatSession(lang),
      completedEnquiry: vars,
    };
  }

  // Contact / Support Flow
  if (state.stage === "contact_email") {
    return {
      reply: localizedReply(
        lang,
        "Thank you! Please share your email address and a brief message about how you'd like to connect or support.",
        "धन्यवाद! कृपया अपना ईमेल पता और छोटा संदेश लिखें।",
        "ਧੰਨਵਾਦ! ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਈਮੇਲ ਅਤੇ ਸੁਨੇਹਾ ਲਿਖੋ।",
      ),
      nextState: { ...state, name: trimmed.slice(0, 100), stage: "contact_message" },
    };
  }

  if (state.stage === "contact_message") {
    const emailMatch = trimmed.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
    const extractedEmail = emailMatch ? emailMatch[0].toLowerCase() : "supporter@rabata.local";
    const vars: SarvamOutputVariables = {
      kind: "contact",
      name: state.name || "Community Supporter",
      email: extractedEmail,
      message: `AI Chat Support/Contact Enquiry: ${trimmed}`,
      consent: true,
      resolved_intent: "supporter_contact",
    };
    return {
      reply: localizedReply(
        lang,
        `Your note has been logged! Tammana will review it and reply from ${site.email}. You can also inspect every receipt-backed expense anytime on /funds.`,
        `आपका संदेश दर्ज हो गया है! तमन्ना जल्द ही ${site.email} से उत्तर देंगी। आप /funds पर सभी खर्च की रसीदें भी देख सकते हैं।`,
        `ਤੁਹਾਡਾ ਸੁਨੇਹਾ ਦਰਜ ਹੋ ਗਿਆ ਹੈ! ਤਮੰਨਾ ਜਲਦੀ ${site.email} ਤੋਂ ਜਵਾਬ ਦੇਣਗੇ।`,
      ),
      nextState: createInitialChatSession(lang),
      completedEnquiry: vars,
    };
  }

  return {
    reply: getWelcomeMessageForLanguage(lang),
    nextState: createInitialChatSession(lang),
  };
}
