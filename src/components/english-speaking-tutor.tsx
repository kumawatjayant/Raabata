import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, MicOff, RotateCcw, Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import {
  ENGLISH_TUTOR_WELCOME,
  generateEnglishTutorReply,
  type TutorCorrection,
  type TutorTurn,
} from "@/lib/english-tutor";

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

function formatTime(): string {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const STARTER_SPARKS = [
  "Hi! How was your day?",
  "Let's talk about my hobbies",
  "Help me practice for an interview",
];

export function EnglishSpeakingTutor() {
  const [turns, setTurns] = useState<TutorTurn[]>([
    { id: "welcome", role: "tutor", text: ENGLISH_TUTOR_WELCOME, timestamp: "" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tutorAgentConfigured, setTutorAgentConfigured] = useState(false);

  const streamRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setMicSupported(Boolean(getSpeechRecognitionCtor()));

    fetch("/api/english-tutor/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tutorAgentConfigured?: boolean } | null) => {
        if (mountedRef.current && data?.tutorAgentConfigured) {
          setTutorAgentConfigured(true);
        }
      })
      .catch(() => null);

    return () => {
      mountedRef.current = false;
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [turns, busy]);

  function speakText(text: string) {
    if (!voiceOutput || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 0.96;
      utterance.onstart = () => {
        if (mountedRef.current) setSpeaking(true);
      };
      utterance.onend = () => {
        if (mountedRef.current) setSpeaking(false);
      };
      utterance.onerror = () => {
        if (mountedRef.current) setSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  }

  async function sendTurn(rawText: string) {
    const clean = rawText.trim();
    if (!clean || busy) return;

    const userTurn: TutorTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      text: clean,
      timestamp: formatTime(),
    };
    const nextHistory = [...turns, userTurn];
    setTurns(nextHistory);
    setInput("");
    setBusy(true);

    let replyText = "";
    let correction: TutorCorrection | undefined;

    try {
      const apiMessages = nextHistory.map((t) => ({
        role: t.role === "tutor" ? ("assistant" as const) : ("user" as const),
        content: t.text,
      }));
      const res = await fetch("/api/english-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          ok?: boolean;
          reply?: string;
          correction?: TutorCorrection | null;
        };
        if (body.ok && body.reply) {
          replyText = body.reply;
          if (body.correction && body.correction.original && body.correction.better) {
            correction = body.correction;
          }
        }
      }
    } catch {
      // fallback cleanly below
    }

    if (!replyText) {
      await new Promise((r) => setTimeout(r, 420));
      const local = generateEnglishTutorReply(clean, turns);
      replyText = local.reply;
      correction = local.correction;
    }

    if (!mountedRef.current) return;

    const tutorTurn: TutorTurn = {
      id: `t-${Date.now() + 1}`,
      role: "tutor",
      text: replyText,
      ...(correction ? { correction } : {}),
      timestamp: formatTime(),
    };
    setTurns((prev) => [...prev, tutorTurn]);
    setBusy(false);
    speakText(replyText);
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }

    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;

    let finalTranscript = "";
    rec.onresult = (event) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result?.[0]?.transcript ?? "";
        if (result?.isFinal) {
          finalTranscript += `${piece} `;
        } else {
          interim += piece;
        }
      }
      const combined = `${finalTranscript}${interim}`.trim();
      if (combined) setInput(combined);
    };
    rec.onerror = () => {
      if (mountedRef.current) setListening(false);
    };
    rec.onend = () => {
      if (!mountedRef.current) return;
      setListening(false);
      const spoken = finalTranscript.trim();
      if (spoken) {
        void sendTurn(spoken);
      }
    };

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  function resetSession() {
    recognitionRef.current?.stop();
    setListening(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setTurns([{ id: "welcome", role: "tutor", text: ENGLISH_TUTOR_WELCOME, timestamp: "" }]);
    setInput("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendTurn(input);
  }

  return (
    <div className="tutor-shell" aria-label="AI English Speaking Friend">
      <div className="tutor-head">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`tutor-orb ${listening ? "is-listening" : speaking ? "is-speaking" : ""}`}
            aria-hidden="true"
          >
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Practice English with a Friend
              </h3>
              <span className="pill-badge pill-green">
                <span className="presence-dot" aria-hidden="true" />
                {tutorAgentConfigured ? "Live Voice Ready" : "Interactive Practice"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Speak or type about any topic — get natural replies and gentle phrasing corrections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="admin-action-btn admin-action-btn-secondary"
            aria-pressed={voiceOutput}
            title={voiceOutput ? "Mute spoken replies" : "Read tutor replies aloud"}
            onClick={() => {
              const next = !voiceOutput;
              setVoiceOutput(next);
              if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                setSpeaking(false);
              }
            }}
          >
            {voiceOutput ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{voiceOutput ? "Voice On" : "Muted"}</span>
          </button>
          <button
            type="button"
            className="admin-action-btn admin-action-btn-secondary"
            onClick={resetSession}
          >
            <RotateCcw size={13} /> New Chat
          </button>
        </div>
      </div>

      <div ref={streamRef} className="tutor-stream">
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`tutor-turn ${turn.role === "user" ? "is-user" : "is-tutor"}`}
          >
            <div className={`tutor-bubble ${turn.role === "user" ? "is-user" : "is-tutor"}`}>
              <p>{turn.text}</p>
              {turn.correction && (
                <div className="tutor-correction">
                  <div className="tutor-correction-label">Gentle phrasing tip</div>
                  <div className="tutor-correction-diff">
                    <span className="tutor-wrong">{turn.correction.original}</span>
                    <span aria-hidden="true">→</span>
                    <strong className="tutor-right">{turn.correction.better}</strong>
                  </div>
                  <p className="tutor-correction-tip">{turn.correction.tip}</p>
                </div>
              )}
              {turn.timestamp && <span className="chat-meta">{turn.timestamp}</span>}
            </div>
          </div>
        ))}

        {busy && (
          <div className="tutor-turn is-tutor">
            <div className="tutor-bubble is-tutor">
              <div className="typing-dots" aria-label="Friend is typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
      </div>

      {turns.length === 1 && (
        <div className="tutor-sparks">
          <span className="text-[11px] font-semibold text-muted-foreground">Try saying:</span>
          {STARTER_SPARKS.map((spark) => (
            <button
              key={spark}
              type="button"
              className="chat-chip"
              onClick={() => void sendTurn(spark)}
            >
              {spark}
            </button>
          ))}
        </div>
      )}

      <form className="tutor-composer" onSubmit={handleSubmit}>
        <button
          type="button"
          className={`tutor-mic-btn ${listening ? "is-listening" : ""}`}
          disabled={!micSupported || busy}
          title={
            micSupported
              ? listening
                ? "Stop listening"
                : "Tap and speak in English"
              : "Voice input not supported in this browser — type below"
          }
          aria-label={listening ? "Stop voice input" : "Start voice input"}
          onClick={toggleListening}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            listening
              ? "Listening… speak naturally in English"
              : "Speak with the mic or type anything you want to talk about…"
          }
          aria-label="Say something to your English speaking friend"
        />
        <button
          type="submit"
          className="admin-action-btn admin-action-btn-primary admin-toolbar-btn"
          disabled={busy || !input.trim()}
        >
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}
