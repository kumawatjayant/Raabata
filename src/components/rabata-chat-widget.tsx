import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, FileCode2, MessageCircle, Phone, RotateCcw, Send, Sparkles, X } from "lucide-react";
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
  RABATA_SARVAM_SYSTEM_PROMPT,
  type ChatSessionState,
  type SarvamCallRecord,
  type SarvamTranscriptTurn,
} from "@/lib/sarvam-agent";
import { site } from "@/lib/site";

interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text: string;
}

export function RabataChatWidget() {
  const { lang, setLang } = useLanguage();
  const submitEnquiryFn = useServerFn(submitEnquiry);
  const [open, setOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [input, setInput] = useState("");
  const [session, setSession] = useState<ChatSessionState>(() => createInitialChatSession("en"));
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "welcome", role: "agent", text: getWelcomeMessageForLanguage("en") },
  ]);
  const [savedNotice, setSavedNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.id === "welcome") {
        return [{ id: "welcome", role: "agent", text: getWelcomeMessageForLanguage(lang) }];
      }
      return prev;
    });
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

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
      stt_model: "Web Text / Sarvam Prompt",
      tts_model: "Interactive Chat UI",
      llm_model: "Sarvam-M Shared Agent",
      start_datetime: nowIso,
      end_datetime: nowIso,
      output_agent_variables: vars,
      interaction_transcript: transcript,
    };

    prependSarvamCall(record);
    if (isLocalDevHost()) {
      appendLocalEnquiry({
        id: record.id,
        created_at: nowIso,
        kind: vars.kind,
        name: vars.name,
        email: vars.email,
        consent: true,
        details: {
          channel: "Web AI Chatbot (Sarvam Prompt)",
          interaction_id: record.interaction_id,
          classLevel: vars.classLevel ?? "",
          subjects: vars.subjects ?? "",
          language: vars.language ?? "",
          format: vars.format ?? "",
          message: vars.message,
        },
      });
    }
    setSavedNotice("Enquiry & full transcript logged to Rabata Admin Console.");
  }

  function sendUserText(raw: string) {
    const clean = raw.trim();
    if (!clean) return;
    setSavedNotice("");
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: clean };
    const result = generateRabataAgentReply(clean, session, lang);
    const botMsg: ChatMessage = { id: `a-${Date.now() + 1}`, role: "agent", text: result.reply };
    const nextMessages = [...messages, userMsg, botMsg];
    setMessages(nextMessages);
    setSession(result.nextState);
    setInput("");
    if (result.completedEnquiry) {
      void logCompletedChat(nextMessages, result.completedEnquiry);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendUserText(input);
  }

  function resetChat() {
    setSession(createInitialChatSession(lang));
    setMessages([{ id: "welcome", role: "agent", text: getWelcomeMessageForLanguage(lang) }]);
    setSavedNotice("");
    setShowPrompt(false);
  }

  return (
    <>
      {open && (
        <aside className="chat-panel" aria-label="Rabata AI Assistant powered by Sarvam prompt">
          <div className="chat-head">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bot size={16} style={{ color: "var(--gold)" }} />
                <strong className="text-sm">Rabata AI Assistant</strong>
              </div>
              <div className="text-[10.5px] opacity-80 truncate">
                Same Sarvam AI Voice Prompt · Helpline{" "}
                <a href={`tel:${site.phone}`} className="underline">
                  {site.phoneDisplay}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="lang-btn"
                title="Inspect shared voice & chat prompt"
                onClick={() => setShowPrompt((s) => !s)}
              >
                <FileCode2 size={14} />
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
                aria-label="Close AI chatbot"
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
              <Phone size={11} /> Call {site.phoneDisplay}
            </a>
          </div>

          {showPrompt ? (
            <div className="chat-body">
              <div className="flex items-center justify-between mb-2">
                <strong className="text-xs text-primary">
                  Shared Calling &amp; Chatbot System Prompt
                </strong>
                <Button size="sm" variant="outline" onClick={() => setShowPrompt(false)}>
                  Back to Chat
                </Button>
              </div>
              <pre className="text-[11px] whitespace-pre-wrap bg-muted p-3 rounded-lg border leading-relaxed">
                {RABATA_SARVAM_SYSTEM_PROMPT}
              </pre>
            </div>
          ) : (
            <div ref={scrollRef} className="chat-body">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`chat-bubble ${m.role === "user" ? "is-user" : "is-agent"}`}
                >
                  {m.text}
                </div>
              ))}
              {savedNotice && <div className="form-status text-xs mt-2">{savedNotice}</div>}
            </div>
          )}

          {!showPrompt && (
            <>
              <div className="chat-chips">
                <button
                  type="button"
                  className="tab-btn"
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  onClick={() => sendUserText("Register a student")}
                >
                  <Sparkles size={11} /> Register student
                </button>
                <button
                  type="button"
                  className="tab-btn"
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  onClick={() => sendUserText("Volunteer mentor")}
                >
                  Volunteer
                </button>
                <button
                  type="button"
                  className="tab-btn"
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  onClick={() => sendUserText("Support / Funds")}
                >
                  Donate / Funds
                </button>
              </div>

              <form className="chat-input-bar" onSubmit={handleSubmit}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    lang === "hi"
                      ? "हिंदी या अंग्रेज़ी में लिखें…"
                      : lang === "pa"
                        ? "ਪੰਜਾਬੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਲਿਖੋ…"
                        : "Ask Rabata AI (English, हिंदी, ਪੰਜਾਬੀ)…"
                  }
                  aria-label="Message Rabata AI Assistant"
                />
                <Button type="submit" size="icon" aria-label="Send message">
                  <Send size={15} />
                </Button>
              </form>
            </>
          )}
        </aside>
      )}

      <div className="chat-fab-wrap">
        <a
          href={`tel:${site.phone}`}
          className="chat-call-pill"
          title="Call Sarvam AI Multilingual Helpline"
        >
          <Phone size={13} /> {site.phoneDisplay}
        </a>
        <button
          type="button"
          className="chat-fab"
          aria-expanded={open}
          aria-label="Open Rabata AI Chatbot"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={18} /> : <MessageCircle size={18} />}
          <span>{open ? "Close AI Chat" : "Rabata AI Chat"}</span>
        </button>
      </div>
    </>
  );
}
