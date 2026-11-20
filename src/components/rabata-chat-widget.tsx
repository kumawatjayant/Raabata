import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, MessageCircle, Phone, RotateCcw, Send, Sparkles, X } from "lucide-react";
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
}

export function RabataChatWidget() {
  const { lang, setLang } = useLanguage();
  const submitEnquiryFn = useServerFn(submitEnquiry);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
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
    setSavedNotice("Enquiry & full transcript saved for Tammana's review.");
  }

  async function sendUserText(raw: string) {
    const clean = raw.trim();
    if (!clean || busy) return;
    setSavedNotice("");
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: clean };
    const localResult = generateRabataAgentReply(clean, session, lang);

    setMessages((prev) => [...prev, userMsg]);
    setSession(localResult.nextState);
    setInput("");

    let finalReply = localResult.reply;
    if (session.stage === "idle" && !localResult.completedEnquiry) {
      setBusy(true);
      try {
        const historyPayload = [...messages, userMsg].map((m) => ({
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
        // seamlessly keep local NLU response
      } finally {
        setBusy(false);
      }
    }

    const botMsg: ChatMessage = { id: `a-${Date.now() + 1}`, role: "agent", text: finalReply };
    const updatedHistory = [...messages, userMsg, botMsg];
    setMessages(updatedHistory);

    if (localResult.completedEnquiry) {
      void logCompletedChat(updatedHistory, localResult.completedEnquiry);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendUserText(input);
  }

  function resetChat() {
    setSession(createInitialChatSession(lang));
    setMessages([{ id: "welcome", role: "agent", text: getWelcomeMessageForLanguage(lang) }]);
    setSavedNotice("");
  }

  return (
    <>
      {open && (
        <aside className="chat-panel" aria-label="Rabata AI Assistant">
          <div className="chat-head">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bot size={16} style={{ color: "var(--gold)" }} />
                <strong className="text-sm">Rabata AI Assistant</strong>
              </div>
              <div className="text-[10.5px] opacity-80 truncate">
                24×7 AI Helpline{" "}
                <a href={`tel:${site.phone}`} className="underline">
                  {site.phoneDisplay}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
              <Phone size={11} /> {site.phoneDisplay}
            </a>
          </div>

          <div ref={scrollRef} className="chat-body">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.role === "user" ? "is-user" : "is-agent"}`}
              >
                {m.text}
              </div>
            ))}
            {busy && <div className="chat-bubble is-agent">Thinking…</div>}
            {savedNotice && <div className="form-status text-xs mt-2">{savedNotice}</div>}
          </div>

          <div className="chat-chips">
            <button
              type="button"
              className="tab-btn"
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => void sendUserText("What classes do you teach?")}
            >
              Classes &amp; fees?
            </button>
            <button
              type="button"
              className="tab-btn"
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => void sendUserText("Register a student")}
            >
              <Sparkles size={11} /> Register student
            </button>
            <button
              type="button"
              className="tab-btn"
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => void sendUserText("I want to volunteer")}
            >
              Volunteer
            </button>
          </div>

          <form className="chat-input-bar" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lang === "hi"
                  ? "हिंदी या अंग्रेज़ी में पूछें…"
                  : lang === "pa"
                    ? "ਪੰਜਾਬੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਪੁੱਛੋ…"
                    : "Ask anything or register (EN · हिंदी · ਪੰਜਾਬੀ)…"
              }
              aria-label="Message Rabata AI Assistant"
            />
            <Button type="submit" size="icon" disabled={busy} aria-label="Send message">
              <Send size={15} />
            </Button>
          </form>
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
