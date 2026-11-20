import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  FileCode2,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminEnquiryItem } from "@/lib/enquiries.functions";
import { appendLocalEnquiry, isLocalDevHost } from "@/lib/local-store";
import {
  convertEnquiriesToSarvamCalls,
  prependSarvamCall,
  RABATA_SARVAM_SYSTEM_PROMPT,
  readSarvamCalls,
  updateSarvamCallStatus,
  writeSarvamCalls,
  type SarvamCallRecord,
} from "@/lib/sarvam-agent";
import { site } from "@/lib/site";

export function AdminSarvamCallTracker({
  dbEnquiries,
  mode,
  onEnrollCall,
  onStatus,
}: {
  dbEnquiries: AdminEnquiryItem[];
  mode: "logs" | "setup";
  onEnrollCall: (call: SarvamCallRecord) => Promise<void>;
  onStatus: (msg: string, isErr?: boolean) => void;
}) {
  const [localCalls, setLocalCalls] = useState<SarvamCallRecord[]>([]);
  const [serverCalls, setServerCalls] = useState<SarvamCallRecord[]>([]);
  const [channelFilter, setChannelFilter] = useState<
    "all" | "sarvam_voice_call" | "rabata_web_chatbot"
  >("all");
  const [search, setSearch] = useState("");
  const [expandedCallId, setExpandedCallId] = useState<string | null>("srv-call-1");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Sarvam Workspace Analytics Sync state
  const [orgId, setOrgId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [appId, setAppId] = useState("");
  const [sarvamApiKey, setSarvamApiKey] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Live Webhook Test state
  const [testName, setTestName] = useState("Diya Sharma");
  const [testPhone, setTestPhone] = useState("+919877123450");
  const [testEmail, setTestEmail] = useState("parent.diya@example.com");
  const [testClass, setTestClass] = useState("4–5");
  const [testSubjects, setTestSubjects] = useState("Spoken English, Mathematics");
  const [testIndic, setTestIndic] = useState(
    "नमस्ते, मेरी बेटी दीया कक्षा 5 में है और उसे अंग्रेज़ी व गणित सीखनी है।",
  );
  const [testBusy, setTestBusy] = useState(false);

  async function refreshFromServer() {
    try {
      const res = await fetch("/api/sarvam-calls");
      if (res.ok) {
        const body = (await res.json()) as { ok?: boolean; calls?: SarvamCallRecord[] };
        if (body.ok && Array.isArray(body.calls)) {
          setServerCalls(body.calls);
        }
      }
    } catch {
      // ignore offline preview errors
    }
  }

  useEffect(() => {
    setLocalCalls(readSarvamCalls());
    void refreshFromServer();
  }, []);

  const allCalls = useMemo(() => {
    const dbDerived = convertEnquiriesToSarvamCalls(dbEnquiries);
    const seen = new Set<string>();
    const combined: SarvamCallRecord[] = [];
    for (const item of [...serverCalls, ...dbDerived, ...localCalls]) {
      if (!seen.has(item.interaction_id)) {
        seen.add(item.interaction_id);
        combined.push(item);
      }
    }
    return combined;
  }, [dbEnquiries, localCalls, serverCalls]);

  const filteredCalls = allCalls.filter((c) => {
    const matchesChannel = channelFilter === "all" || c.channel === channelFilter;
    const text =
      `${c.user_phone_number} ${c.interaction_id} ${c.output_agent_variables.name} ${c.output_agent_variables.email} ${c.output_agent_variables.subjects ?? ""} ${JSON.stringify(c.interaction_transcript)}`.toLowerCase();
    return matchesChannel && text.includes(search.toLowerCase());
  });

  const voiceCount = allCalls.filter((c) => c.channel === "sarvam_voice_call").length;
  const chatCount = allCalls.filter((c) => c.channel === "rabata_web_chatbot").length;
  const avgDuration =
    allCalls.length > 0
      ? Math.round(allCalls.reduce((sum, c) => sum + Number(c.duration || 0), 0) / allCalls.length)
      : 0;

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/sarvam-webhook`
      : "https://rabata-hub-connect-main.vercel.app/api/sarvam-webhook";

  async function handleCopyWebhook() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  }

  async function handleSyncSarvamAnalytics(e: FormEvent) {
    e.preventDefault();
    setSyncing(true);
    try {
      const res = await fetch("/api/sarvam-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, workspaceId, appId, apiKey: sarvamApiKey }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        count?: number;
        calls?: SarvamCallRecord[];
        error?: string;
      };
      if (!res.ok || !json.ok || !json.calls) {
        onStatus(json.error || "Unable to sync from Sarvam Analytics API.", true);
        return;
      }
      const next = [...json.calls, ...localCalls];
      writeSarvamCalls(next);
      setLocalCalls(next);
      await refreshFromServer();
      onStatus(`Synced ${json.count ?? json.calls.length} real Sarvam calls & transcripts.`);
    } catch {
      onStatus("Failed to connect to Sarvam Analytics proxy.", true);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSendTestWebhook(e: FormEvent) {
    e.preventDefault();
    setTestBusy(true);
    try {
      const payload = {
        app_id: "rabata-samvaad-helpline",
        app_version: 3,
        deployment_id: "rabata-voice-prod-v3",
        interaction_id: `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}/samvaad-${Date.now()}`,
        user_phone_number: testPhone,
        agent_phone_number: site.phone,
        duration: 68.5,
        status: "completed",
        output_agent_variables: {
          kind: "student",
          name: testName,
          email: testEmail,
          classLevel: testClass,
          subjects: testSubjects,
          language: "Hindi",
          format: "In person",
          consent: true,
        },
        interaction_transcript: [
          {
            turn_id: 1,
            role: "agent",
            en_text: `Namaste! Welcome to Rabata Helpline (${site.phoneDisplay}). Are you calling to register a student or volunteer?`,
            indic_text: `नमस्ते! राबता हेल्पलाइन (${site.phoneDisplay}) में आपका स्वागत है।`,
          },
          {
            turn_id: 2,
            role: "user",
            en_text: `I want to register ${testName} (${testClass}) for ${testSubjects}. Contact: ${testEmail}`,
            indic_text: testIndic,
          },
        ],
      };

      const res = await fetch("/api/sarvam-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        record?: SarvamCallRecord;
        persistedToSupabase?: boolean;
      };
      if (res.ok && json.ok && json.record) {
        setLocalCalls(prependSarvamCall(json.record));
        setExpandedCallId(json.record.id);
        await refreshFromServer();
        if (isLocalDevHost()) {
          appendLocalEnquiry({
            id: json.record.id,
            created_at: json.record.start_datetime,
            kind: "student",
            name: json.record.output_agent_variables.name,
            email: json.record.output_agent_variables.email,
            consent: true,
            details: {
              channel: `Sarvam AI Voice Call (${site.phoneDisplay})`,
              caller: json.record.user_phone_number,
              interaction_id: json.record.interaction_id,
              classLevel: json.record.output_agent_variables.classLevel ?? "",
              subjects: json.record.output_agent_variables.subjects ?? "",
              message: json.record.output_agent_variables.message,
            },
          });
        }
        onStatus(
          `Live POST /api/sarvam-webhook succeeded (${json.record.interaction_id})${
            json.persistedToSupabase ? " & saved to Postgres!" : "."
          }`,
        );
      } else {
        onStatus("Webhook test endpoint rejected payload.", true);
      }
    } catch {
      onStatus("Error contacting /api/sarvam-webhook.", true);
    } finally {
      setTestBusy(false);
    }
  }

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

  if (mode === "setup") {
    return (
      <div className="space-y-8">
        <div className="form-panel space-y-4">
          <div className="eyebrow">
            <Webhook size={13} /> Step 1 · Connect Your Sarvam AI Samvaad Agent
          </div>
          <h2>Live Webhook Endpoint for Helpline {site.phoneDisplay}</h2>
          <p className="section-copy">
            In your <strong>Sarvam Dashboard → Settings → Webhooks</strong>, set the Callback URL
            below. When any phone call to <strong>{site.phoneDisplay}</strong> finishes, Sarvam
            automatically sends the bilingual transcript (<code>interaction_transcript</code>) and
            extracted fields straight into Rabata&apos;s Call Tracker &amp; Enquiries Inbox.
          </p>
          <div className="flex flex-wrap items-center gap-2 bg-muted p-3 rounded-lg border">
            <code className="text-xs flex-1 break-all">{webhookUrl}</code>
            <Button size="sm" variant="outline" onClick={handleCopyWebhook}>
              {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              {copiedUrl ? "Copied!" : "Copy URL"}
            </Button>
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground">
            <div>
              <strong>Optional Env Security:</strong> Add{" "}
              <code>SARVAM_WEBHOOK_SECRET=whsec_...</code> on Vercel to verify{" "}
              <code>Sarvam-Signature</code> + <code>Sarvam-Timestamp</code>.
            </div>
            <div>
              <strong>Live AI Chatbot Key:</strong> Add <code>SARVAM_API_KEY</code> on Vercel to
              enable live Sarvam AI LLM completions on <code>POST /api/sarvam-chat</code>.
            </div>
          </div>
        </div>

        <form className="form-panel space-y-4" onSubmit={handleSyncSarvamAnalytics}>
          <div className="eyebrow">
            <RefreshCw size={13} /> Step 2 · Pull Historical Calls from Sarvam Analytics API
          </div>
          <h3>Fetch Existing Call Logs &amp; Transcripts</h3>
          <p className="text-xs text-muted-foreground">
            Queries{" "}
            <code>
              https://apps.sarvam.ai/api/analytics/v1/{"{org_id}"}/{"{workspace_id}"}/{"{app_id}"}
              /interactions?include_transcript=true
            </code>{" "}
            server-side using your Sarvam <code>X-API-Key</code>.
          </p>
          <div className="form-grid">
            <label className="field">
              Organization ID (org_id) *
              <input
                required
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="org-..."
              />
            </label>
            <label className="field">
              Workspace ID (workspace_id) *
              <input
                required
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                placeholder="ws-..."
              />
            </label>
            <label className="field">
              Agent / App ID (app_id) *
              <input
                required
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="app-..."
              />
            </label>
            <label className="field">
              Sarvam Workspace X-API-Key *
              <input
                type="password"
                required
                value={sarvamApiKey}
                onChange={(e) => setSarvamApiKey(e.target.value)}
                placeholder="Used on-demand server-side; not stored"
              />
            </label>
          </div>
          <Button type="submit" disabled={syncing}>
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing from Sarvam…" : "Fetch Calls & Transcripts from Sarvam"}
          </Button>
        </form>

        <form className="form-panel space-y-4" onSubmit={handleSendTestWebhook}>
          <div className="eyebrow">
            <Phone size={13} /> Step 3 · Verify End-to-End Webhook Ingestion
          </div>
          <h3>Send Live Test Call to /api/sarvam-webhook</h3>
          <div className="form-grid">
            <label className="field">
              Student / Caller Name *
              <input required value={testName} onChange={(e) => setTestName(e.target.value)} />
            </label>
            <label className="field">
              Caller Phone *
              <input required value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            </label>
            <label className="field">
              Email *
              <input
                type="email"
                required
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </label>
            <label className="field">
              Class Level
              <input value={testClass} onChange={(e) => setTestClass(e.target.value)} />
            </label>
            <label className="field wide">
              Subjects Requested
              <input value={testSubjects} onChange={(e) => setTestSubjects(e.target.value)} />
            </label>
            <label className="field wide">
              Hindi / Punjabi User Turn (indic_text)
              <input value={testIndic} onChange={(e) => setTestIndic(e.target.value)} />
            </label>
          </div>
          <Button type="submit" disabled={testBusy}>
            <Webhook size={14} />
            {testBusy ? "Sending POST /api/sarvam-webhook…" : "Send Live Webhook Test Call"}
          </Button>
        </form>

        <details className="form-panel">
          <summary className="cursor-pointer font-semibold text-primary flex items-center gap-2 text-sm">
            <FileCode2 size={16} /> Shared System Prompt for Sarvam Voice Agent &amp; Web Chatbot
          </summary>
          <pre className="mt-4 whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg border leading-relaxed">
            {RABATA_SARVAM_SYSTEM_PROMPT}
          </pre>
        </details>
      </div>
    );
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
            <MessageSquareText size={15} /> Tracked Conversations
          </div>
          <div className="stat-value">{allCalls.length}</div>
          <small className="stat-note">
            {voiceCount} phone calls · {chatCount} web AI chats
          </small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <Clock size={15} /> Avg Call Duration
          </div>
          <div className="stat-value">{avgDuration}s</div>
          <small className="stat-note">Turn-by-turn transcript log</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <Bot size={15} /> Languages Handled
          </div>
          <div className="stat-value" style={{ fontSize: 24 }}>
            HI · PA · EN
          </div>
          <small className="stat-note">Hindi, Punjabi &amp; English</small>
        </article>
      </div>

      <div className="filters" style={{ gridTemplateColumns: "2fr 1fr auto" }}>
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search calls and transcripts"
            placeholder="Search by caller phone, student name, keyword or transcript text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter calls by channel"
          value={channelFilter}
          onChange={(e) =>
            setChannelFilter(e.target.value as "all" | "sarvam_voice_call" | "rabata_web_chatbot")
          }
        >
          <option value="all">All Channels ({allCalls.length})</option>
          <option value="sarvam_voice_call">Phone Calls ({voiceCount})</option>
          <option value="rabata_web_chatbot">Web AI Chatbot ({chatCount})</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => void refreshFromServer()}>
          <RefreshCw size={14} /> Refresh Live Calls
        </Button>
      </div>

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
                          <Phone size={11} /> Phone Call ({call.agent_phone_number})
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
                    title="Download full Sarvam JSON transcript"
                  >
                    <Download size={14} /> JSON
                  </Button>
                  {vars.kind === "student" && call.status !== "enrolled" && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await onEnrollCall(call);
                        setLocalCalls(updateSarvamCallStatus(call.id, "enrolled"));
                      }}
                    >
                      <UserPlus size={14} /> Enroll Student
                    </Button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="transcript-box">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>
                      <strong>Started:</strong>{" "}
                      {new Date(call.start_datetime).toLocaleString("en-IN")} ·{" "}
                      <strong>Stack:</strong> {call.llm_model}
                    </span>
                    <span>
                      <strong>Consent:</strong> {vars.consent ? "Verified" : "Pending"}
                    </span>
                  </div>
                  {call.interaction_transcript.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No turn-by-turn turns included; summary: {vars.message}
                    </p>
                  ) : (
                    call.interaction_transcript.map((turn) => (
                      <div key={`${call.id}-${turn.turn_id}`} className="transcript-turn">
                        <strong
                          className={`block mb-1 ${
                            turn.role === "agent" ? "text-primary" : "text-foreground"
                          }`}
                        >
                          Turn {turn.turn_id} ·{" "}
                          {turn.role === "agent" ? "Rabata AI Assistant" : "Caller / Visitor"}
                        </strong>
                        {turn.indic_text && (
                          <div className="text-foreground font-medium mb-1">{turn.indic_text}</div>
                        )}
                        <div className="text-muted-foreground">{turn.en_text}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
