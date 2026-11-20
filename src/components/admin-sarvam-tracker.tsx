import { useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileCode2,
  MessageSquareText,
  Phone,
  UserPlus,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { appendLocalEnquiry, isLocalDevHost } from "@/lib/local-store";
import type { AdminEnquiryItem } from "@/lib/enquiries.functions";
import {
  parseSarvamWebhookPayload,
  prependSarvamCall,
  RABATA_SARVAM_SYSTEM_PROMPT,
  type SarvamCallRecord,
} from "@/lib/sarvam-agent";
import { site } from "@/lib/site";

const SAMPLE_SARVAM_WEBHOOK = JSON.stringify(
  {
    app_id: "rabata-samvaad-helpline",
    app_version: 3,
    deployment_id: "rabata-voice-prod-v3",
    interaction_id: "20261120/samvaad-demo-webhook",
    user_phone_number: "+919877123450",
    agent_phone_number: "+917965481661",
    duration: 72.5,
    status: "completed",
    output_agent_variables: {
      kind: "student",
      name: "Riya",
      email: "parent.riya@example.com",
      classLevel: "6–8",
      subjects: "Spoken English, Mathematics",
      language: "Hindi",
      format: "In person",
      consent: true,
    },
    interaction_transcript: [
      {
        turn_id: 1,
        role: "agent",
        en_text: "Namaste! Welcome to Rabata. Are you calling to register a student or volunteer?",
        indic_text: "नमस्ते! राबता में आपका स्वागत है। क्या आप छात्र पंजीकरण के लिए कॉल कर रहे हैं?",
      },
      {
        turn_id: 2,
        role: "user",
        en_text: "Yes, I want to enroll my daughter Riya in Class 7 for English and Maths.",
        indic_text: "हाँ, मुझे अपनी बेटी रिया (कक्षा 7) का अंग्रेज़ी और गणित के लिए नाम लिखवाना है।",
      },
    ],
  },
  null,
  2,
);

export function AdminSarvamCallTracker({
  calls,
  onCallsChange,
  onEnrollCall,
  onStatus,
}: {
  calls: SarvamCallRecord[];
  onCallsChange: (next: SarvamCallRecord[]) => void;
  onEnrollCall: (call: SarvamCallRecord) => Promise<void>;
  onStatus: (msg: string, isErr?: boolean) => void;
}) {
  const [channelFilter, setChannelFilter] = useState<
    "all" | "sarvam_voice_call" | "rabata_web_chatbot"
  >("all");
  const [expandedCallId, setExpandedCallId] = useState<string | null>(calls[0]?.id ?? "srv-call-1");
  const [showIntegrationSpec, setShowIntegrationSpec] = useState(false);
  const [webhookJson, setWebhookJson] = useState(SAMPLE_SARVAM_WEBHOOK);

  const voiceCount = calls.filter((c) => c.channel === "sarvam_voice_call").length;
  const chatCount = calls.filter((c) => c.channel === "rabata_web_chatbot").length;
  const avgDuration =
    calls.length > 0
      ? Math.round(calls.reduce((sum, c) => sum + Number(c.duration || 0), 0) / calls.length)
      : 0;

  const filteredCalls = calls.filter((c) => channelFilter === "all" || c.channel === channelFilter);

  function downloadTranscriptJson(call: SarvamCallRecord) {
    if (typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(call, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sarvam-transcript-${call.interaction_id.replace(/[^a-zA-Z0-9_-]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleIngestWebhook() {
    try {
      const record = parseSarvamWebhookPayload(webhookJson);
      const next = prependSarvamCall(record);
      onCallsChange(next);
      setExpandedCallId(record.id);

      const vars = record.output_agent_variables;
      if (isLocalDevHost()) {
        const entry: AdminEnquiryItem = {
          id: record.id,
          created_at: record.start_datetime,
          kind: vars.kind,
          name: vars.name,
          email: vars.email,
          consent: vars.consent,
          details: {
            channel: "Sarvam Samvaad Webhook",
            caller: record.user_phone_number,
            interaction_id: record.interaction_id,
            classLevel: vars.classLevel ?? "",
            subjects: vars.subjects ?? "",
            language: vars.language ?? "",
            message: vars.message,
          },
        };
        appendLocalEnquiry(entry);
      }

      onStatus(
        `Parsed Sarvam Samvaad webhook ${record.interaction_id} (${record.interaction_transcript.length} transcript turns).`,
      );
    } catch {
      onStatus("Invalid Sarvam webhook JSON payload.", true);
    }
  }

  return (
    <div className="space-y-6">
      <div className="stat-cards">
        <article className="stat-card">
          <div className="stat-label">
            <Phone size={15} /> Sarvam Helpline
          </div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {site.phoneDisplay}
          </div>
          <small className="stat-note">Samvaad · Saaras v2 · Bulbul v1</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <MessageSquareText size={15} /> Total Calls &amp; Chats
          </div>
          <div className="stat-value">{calls.length}</div>
          <small className="stat-note">
            {voiceCount} phone calls · {chatCount} web AI chats
          </small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <Clock size={15} /> Avg Call Duration
          </div>
          <div className="stat-value">{avgDuration}s</div>
          <small className="stat-note">With turn-by-turn transcripts</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <Bot size={15} /> Indic Languages
          </div>
          <div className="stat-value" style={{ fontSize: 24 }}>
            HI · PA · EN
          </div>
          <small className="stat-note">Bilingual Devanagari / Gurmukhi + English</small>
        </article>
      </div>

      <div className="section-head">
        <div>
          <div className="eyebrow">
            <Webhook size={13} /> Sarvam AI Samvaad Call &amp; Transcript Ledger
          </div>
          <h2>
            Tracked Calls, Chatbot Sessions &amp; Bilingual Transcripts ({filteredCalls.length})
          </h2>
          <p className="section-copy">
            Every inbound call to <strong>{site.phoneDisplay}</strong> and web AI chatbot session
            stores structured variables alongside its full turn-by-turn Sarvam{" "}
            <code>interaction_transcript</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            aria-label="Filter calls by channel"
            className="border rounded px-3 py-2 text-xs bg-background"
            value={channelFilter}
            onChange={(e) =>
              setChannelFilter(e.target.value as "all" | "sarvam_voice_call" | "rabata_web_chatbot")
            }
          >
            <option value="all">All Channels ({calls.length})</option>
            <option value="sarvam_voice_call">Phone Calls · {site.phoneDisplay}</option>
            <option value="rabata_web_chatbot">Web AI Chatbot</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowIntegrationSpec((prev) => !prev)}
          >
            <FileCode2 size={14} />{" "}
            {showIntegrationSpec ? "Hide Sarvam API / Prompt" : "Sarvam Webhook & Prompt"}
          </Button>
        </div>
      </div>

      {showIntegrationSpec && (
        <div className="form-panel space-y-4">
          <div className="eyebrow">Sarvam AI Samvaad Integration Specification</div>
          <h3>Webhook Signature Verification &amp; Analytics API</h3>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <div>
              <strong>Helpline Number:</strong> <code>{site.phone}</code> ({site.phoneDisplay})
            </div>
            <div>
              <strong>Webhook Verification Headers:</strong> <code>Sarvam-Signature</code>{" "}
              (HMAC-SHA256 of <code>{"{timestamp}.{raw_body}"}</code> with <code>whsec_*</code>) and{" "}
              <code>Sarvam-Timestamp</code>
            </div>
            <div>
              <strong>Transcript Analytics Endpoint:</strong>{" "}
              <code>
                GET https://apps.sarvam.ai/api/analytics/v1/{"{org_id}"}/{"{workspace_id}"}/
                {"{app_id}"}/interactions?include_transcript=true
              </code>{" "}
              (header: <code>X-API-Key</code>)
            </div>
          </div>

          <details className="border rounded-lg p-3 bg-muted text-xs">
            <summary className="cursor-pointer font-semibold text-primary">
              Inspect Shared Calling &amp; Chatbot System Prompt (Sarvam AI)
            </summary>
            <pre className="mt-3 whitespace-pre-wrap text-[11px] leading-relaxed">
              {RABATA_SARVAM_SYSTEM_PROMPT}
            </pre>
          </details>

          <div>
            <label className="field">
              Test Live Sarvam Samvaad Webhook JSON Ingestion (<code>interaction_transcript</code>)
              <textarea
                rows={8}
                className="font-mono text-[11px]"
                value={webhookJson}
                onChange={(e) => setWebhookJson(e.target.value)}
              />
            </label>
            <Button size="sm" className="mt-3" onClick={handleIngestWebhook}>
              <Webhook size={14} /> Parse &amp; Log Webhook Call Transcript
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredCalls.map((call) => {
          const isOpen = expandedCallId === call.id;
          const vars = call.output_agent_variables;
          return (
            <article key={call.id} className="sarvam-call-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="ledger-badges">
                    <span
                      className={`pill-badge ${
                        call.channel === "sarvam_voice_call" ? "pill-gold" : "pill-green"
                      }`}
                    >
                      {call.channel === "sarvam_voice_call" ? (
                        <>
                          <Phone size={11} /> Voice Call ({call.agent_phone_number})
                        </>
                      ) : (
                        <>
                          <Bot size={11} /> Web AI Chatbot
                        </>
                      )}
                    </span>
                    <span className="pill-badge">{call.detected_language}</span>
                    <span className="pill-badge">
                      {call.stt_model} · {call.tts_model}
                    </span>
                    <span
                      className={`pill-badge ${call.status === "enrolled" ? "pill-green" : ""}`}
                    >
                      {call.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(call.duration)}s · {call.interaction_transcript.length} turns
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-semibold">
                    {vars.name} ·{" "}
                    <span className="font-normal text-muted-foreground">
                      {call.user_phone_number} · {vars.email}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Intent:</strong> {vars.resolved_intent || vars.kind}
                    {vars.classLevel ? ` · Class ${vars.classLevel}` : ""}
                    {vars.subjects ? ` · Subjects: ${vars.subjects}` : ""}
                    {vars.language ? ` · Language: ${vars.language}` : ""}
                    {" · "}
                    <code>{call.interaction_id}</code>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedCallId(isOpen ? null : call.id)}
                  >
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isOpen ? "Hide Transcript" : "View Transcript"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadTranscriptJson(call)}
                    title="Download full Sarvam Samvaad JSON transcript"
                  >
                    <Download size={14} /> JSON
                  </Button>
                  {vars.kind === "student" && call.status !== "enrolled" && (
                    <Button size="sm" onClick={() => void onEnrollCall(call)}>
                      <UserPlus size={14} /> Enroll Student
                    </Button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="transcript-box">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>
                      <strong>Start:</strong>{" "}
                      {new Date(call.start_datetime).toLocaleString("en-IN")} ·{" "}
                      <strong>Model Stack:</strong> {call.llm_model}
                    </span>
                    <span>
                      <strong>Guardian Consent:</strong> {vars.consent ? "Verified" : "Pending"}
                    </span>
                  </div>
                  {call.interaction_transcript.map((turn) => (
                    <div key={`${call.id}-${turn.turn_id}`} className="transcript-turn">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <strong
                          className={turn.role === "agent" ? "text-primary" : "text-foreground"}
                        >
                          Turn {turn.turn_id} ·{" "}
                          {turn.role === "agent" ? "Rabata Sarvam AI" : "Caller / Visitor"}
                        </strong>
                      </div>
                      {turn.indic_text && (
                        <div className="text-foreground font-medium mb-1">{turn.indic_text}</div>
                      )}
                      <div className="text-muted-foreground">{turn.en_text}</div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
