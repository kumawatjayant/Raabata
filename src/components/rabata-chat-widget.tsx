import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bot,
  MessageCircle,
  Mic,
  MicOff,
  Phone,
  RotateCcw,
  Send,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { enquirySchema } from "@/lib/enquiry-schema";
import { submitEnquiry } from "@/lib/enquiries.functions";
import { LANGUAGE_OPTIONS, useLanguage } from "@/lib/i18n";
import {
  appendLocalEnquiry,
  isLocalDevHost,
  makeLocalId,
  shouldUseLocalMode,
} from "@/lib/local-store";
import {
  createInitialChatSession,
  generateRabataAgentReply,
  getWelcomeMessageForLanguage,
  prependSarvamCall,
  type ChatSessionState,
  type SarvamCallRecord,
  type SarvamTranscriptTurn,
} from "@/lib/sarvam-agent";
import { site } from "@/lib/site";

interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text: string;
  timestamp: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike | undefined;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as Record<string, unknown>;
  const ctor = win["SpeechRecognition"] ?? win["webkitSpeechRecognition"];
  return typeof ctor === "function" ? (ctor as SpeechRecognitionCtor) : null;
}

function nowTime(): string {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const DEFAULT_CHIPS = ["Classes & fees?", "Practice English", "Register a student"];

export function RabataChatWidget() {
  const { lang, setLang } = useLanguage();
  const submitEnquiryFn = useServerFn(submitEnquiry);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_CHIPS);
  const [session, setSession] = useState<ChatSessionState>(() => createInitialChatSession("en"));
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "welcome", role: "agent", text: getWelcomeMessageForLanguage("en"), timestamp: "" },
  ]);
  const [savedNotice, setSavedNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setMicSupported(Boolean(getSpeechRecognitionCtor()));
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.id === "welcome") {
        return [
          { id: "welcome", role: "agent", text: getWelcomeMessageForLanguage(lang), timestamp: "" },
        ];
      }
      return prev;
    });
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, busy]);

  function speakReply(text: string) {
    if (!voiceOutput || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "hi" ? "hi-IN" : lang === "pa" ? "pa-IN" : "en-IN";
      utterance.rate = 0.98;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore speech synthesis errors
    }
  }

  async function logCompletedChat(
    allMessages: ChatMessage[],
    vars: NonNullable<ReturnType<typeof generateRabataAgentReply>["completedEnquiry"]>,
  ) {
    const parsed = enquirySchema.safeParse({
      kind: vars.kind,
      name: vars.name,
      email: vars.email,
      classLevel: vars.classLevel,
      subjects: vars.subjects,
      language: vars.language ?? "Hindi and English",
      format: vars.format ?? "Either",
      qualifications: vars.qualifications,
      experience: vars.experience,
      availability: vars.availability,
      message: vars.message,
      consent: true,
      website: "",
    });

    if (parsed.success && !shouldUseLocalMode()) {
      await submitEnquiryFn({ data: parsed.data }).catch(() => null);
    }

    const transcript: SarvamTranscriptTurn[] = allMessages.map((m, idx) => ({
      turn_id: idx + 1,
      role: m.role,
      en_text: m.text,
      ...(lang !== "en" ? { indic_text: m.text } : {}),
    }));

    const nowIso = new Date().toISOString();
    const record: SarvamCallRecord = {
      id: makeLocalId("chat"),
      interaction_id: `${nowIso.slice(0, 10).replace(/-/g, "")}/web-chat-${Date.now()}`,
      app_id: "rabata-web-assistant",
      deployment_id: "rabata-shared-sarvam-prompt",
      channel: "rabata_web_chatbot",
      user_phone_number: vars.email,
      agent_phone_number: site.phone,
      duration: Math.max(20, transcript.length * 14),
      status: "completed",
      detected_language: lang === "hi" ? "hi-IN" : lang === "pa" ? "pa-IN" : "en-IN",
      stt_model: "Sarvam Prompt",
      tts_model: "Web AI Chat",
      llm_model: "Sarvam AI",
      start_datetime: nowIso,
      end_datetime: nowIso,
      output_agent_variables: vars,
      interaction_transcript: transcript,
    };

    prependSarvamCall(record);
    void fetch("/api/sarvam-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    }).catch(() => null);

    if (isLocalDevHost()) {
      appendLocalEnquiry({
        id: record.id,
        created_at: nowIso,
        kind: vars.kind,
        name: vars.name,
        email: vars.email,
        consent: true,
        details: {
          channel: "Website Chat",
          interaction_id: record.interaction_id,
          classLevel: vars.classLevel ?? "",
          subjects: vars.subjects ?? "",
          language: vars.language ?? "",
          format: vars.format ?? "",
          message: vars.message,
        },
      });
    }
    setSavedNotice("Enquiry saved for Tammana's review.");
  }

  async function sendUserText(raw: string) {
    const clean = raw.trim();
    if (!clean || busy) return;
    setSavedNotice("");
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: clean,
      timestamp: nowTime(),
    };
    const localResult = generateRabataAgentReply(clean, session, lang);

    const pendingHistory = [...messages, userMsg];
    setMessages(pendingHistory);
    setSession(localResult.nextState);
    if (localResult.suggestions) {
      setSuggestions(localResult.suggestions);
    }
    setInput("");
    setBusy(true);

    let finalReply = "";
    if (session.stage === "idle" && !localResult.completedEnquiry) {
      try {
        const historyPayload = pendingHistory.map((m) => ({
          role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        }));
        const res = await fetch("/api/sarvam-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyPayload }),
        });
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; reply?: string };
          if (data.ok && data.reply) {
            finalReply = data.reply;
          }
        }
      } catch {
        // seamlessly fall back to local conversational reply
      }
    }

    if (!finalReply) {
      await new Promise((r) => setTimeout(r, 420));
      finalReply = localResult.reply;
    }

    setBusy(false);

    const botMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: "agent",
      text: finalReply,
      timestamp: nowTime(),
    };
    const updatedHistory = [...pendingHistory, botMsg];
    setMessages(updatedHistory);
    speakReply(finalReply);

    if (localResult.completedEnquiry) {
      void logCompletedChat(updatedHistory, localResult.completedEnquiry);
    }
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = lang === "hi" ? "hi-IN" : lang === "pa" ? "pa-IN" : "en-IN";
    rec.interimResults = true;
    rec.continuous = false;

    let finalSpoken = "";
    rec.onresult = (event) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalSpoken += `${piece} `;
        else interim += piece;
      }
      const next = `${finalSpoken}${interim}`.trim();
      if (next) setInput(next);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      const clean = finalSpoken.trim();
      if (clean) void sendUserText(clean);
    };
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendUserText(input);
  }

  function resetChat() {
    recognitionRef.current?.stop();
    setListening(false);
    setSession(createInitialChatSession(lang));
    setMessages([
      { id: "welcome", role: "agent", text: getWelcomeMessageForLanguage(lang), timestamp: "" },
    ]);
    setSuggestions(DEFAULT_CHIPS);
    setSavedNotice("");
  }

  return (
    <>
      {open && (
        <aside className="chat-panel" aria-label="Rabata Help Desk Chat">
          <div className="chat-head">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bot size={16} style={{ color: "var(--gold)" }} />
                <strong className="text-sm">Rabata Help Desk</strong>
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] opacity-85 truncate mt-0.5">
                <span className="presence-dot" aria-hidden="true" />
                <span>Online · Hindi, Punjabi &amp; English</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="lang-btn"
                title={voiceOutput ? "Mute spoken replies" : "Read replies aloud"}
                aria-pressed={voiceOutput}
                onClick={() => {
                  const next = !voiceOutput;
                  setVoiceOutput(next);
                  if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                }}
              >
                {voiceOutput ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              <button
                type="button"
                className="lang-btn"
                title="Restart conversation"
                onClick={resetChat}
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                className="lang-btn"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted text-[11px]">
            <div className="lang-switcher is-light" role="group" aria-label="Chat language">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  className={`lang-btn ${lang === opt.code ? "is-active" : ""}`}
                  onClick={() => setLang(opt.code)}
                >
                  {opt.nativeName}
                </button>
              ))}
            </div>
            <a
              href={`tel:${site.phone}`}
              className="inline-flex items-center gap-1 font-semibold text-primary"
            >
              <Phone size={11} /> {site.phoneDisplay}
            </a>
          </div>

          <div ref={scrollRef} className="chat-body">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.role === "user" ? "is-user" : "is-agent"}`}
              >
                <div>{m.text}</div>
                {m.timestamp && <span className="chat-meta">{m.timestamp}</span>}
              </div>
            ))}
            {busy && (
              <div className="chat-bubble is-agent">
                <div className="typing-dots" aria-label="Typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            {savedNotice && <div className="form-status text-xs mt-2">{savedNotice}</div>}
          </div>

          {suggestions.length > 0 && (
            <div className="chat-chips">
              {suggestions.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="chat-chip"
                  disabled={busy}
                  onClick={() => void sendUserText(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <form className="chat-input-bar" onSubmit={handleSubmit}>
            {micSupported && (
              <button
                type="button"
                className={`tutor-mic-btn is-sm ${listening ? "is-listening" : ""}`}
                onClick={toggleMic}
                disabled={busy}
                aria-label={listening ? "Stop voice input" : "Speak message"}
                title={listening ? "Stop listening" : "Speak your message"}
              >
                {listening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                listening
                  ? "Listening…"
                  : lang === "hi"
                    ? "हिंदी या अंग्रेज़ी में बात करें…"
                    : lang === "pa"
                      ? "ਪੰਜਾਬੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਗੱਲ ਕਰੋ…"
                      : "Message Rabata like a friend…"
              }
              aria-label="Message Rabata AI Assistant"
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
              <Send size={15} />
            </Button>
          </form>
        </aside>
      )}

      <div className="chat-fab-wrap">
        <a href={`tel:${site.phone}`} className="chat-call-pill" title="Call Rabata Helpline">
          <Phone size={13} /> {site.phoneDisplay}
        </a>
        <button
          type="button"
          className="chat-fab"
          aria-expanded={open}
          aria-label="Chat with Rabata"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={18} /> : <MessageCircle size={18} />}
          <span>{open ? "Close Chat" : "Chat with Rabata"}</span>
        </button>
      </div>
    </>
  );
}
