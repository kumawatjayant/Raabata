import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MessageCircle,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminEnquiryItem } from "@/lib/enquiries.functions";
import {
  convertEnquiriesToSarvamCalls,
  readSarvamCalls,
  updateSarvamCallStatus,
  type SarvamCallRecord,
} from "@/lib/sarvam-agent";
import { site } from "@/lib/site";

function formatLanguageLabel(code: SarvamCallRecord["detected_language"], raw?: string): string {
  if (raw && raw.trim()) return raw;
  if (code === "hi-IN") return "Hindi";
  if (code === "pa-IN") return "Punjabi";
  return "English";
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return mins > 0 ? `${mins}m ${rem}s` : `${rem}s`;
}

export function AdminSarvamCallTracker({
  dbEnquiries,
  onEnrollCall,
}: {
  dbEnquiries: AdminEnquiryItem[];
  onEnrollCall: (call: SarvamCallRecord) => Promise<void>;
}) {
  const [localCalls, setLocalCalls] = useState<SarvamCallRecord[]>([]);
  const [serverCalls, setServerCalls] = useState<SarvamCallRecord[]>([]);
  const [channelFilter, setChannelFilter] = useState<
    "all" | "sarvam_voice_call" | "rabata_web_chatbot"
  >("all");
  const [search, setSearch] = useState("");
  const [expandedCallId, setExpandedCallId] = useState<string | null>("srv-call-1");
  const [refreshing, setRefreshing] = useState(false);

  async function refreshFromServer() {
    setRefreshing(true);
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
    } finally {
      setRefreshing(false);
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
      `${c.user_phone_number} ${c.output_agent_variables.name} ${c.output_agent_variables.email} ${c.output_agent_variables.subjects ?? ""} ${JSON.stringify(c.interaction_transcript)}`.toLowerCase();
    return matchesChannel && text.includes(search.toLowerCase());
  });

  const phoneCallsCount = allCalls.filter((c) => c.channel === "sarvam_voice_call").length;
  const studentCallsCount = allCalls.filter(
    (c) => c.output_agent_variables.kind === "student",
  ).length;
  const avgDuration =
    allCalls.length > 0
      ? Math.round(allCalls.reduce((sum, c) => sum + Number(c.duration || 0), 0) / allCalls.length)
      : 0;

  return (
    <div className="space-y-6">
      <div className="stat-cards">
        <article className="stat-card">
          <div className="stat-label">
            <Phone size={15} /> Helpline Number
          </div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {site.phoneDisplay}
          </div>
          <small className="stat-note">Hindi, Punjabi &amp; English</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <MessageSquareText size={15} /> Recent Calls
          </div>
          <div className="stat-value">{phoneCallsCount}</div>
          <small className="stat-note">{allCalls.length} total calls &amp; website chats</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <Clock size={15} /> Average Duration
          </div>
          <div className="stat-value">{formatDuration(avgDuration)}</div>
          <small className="stat-note">Across recorded helpline calls</small>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <UserPlus size={15} /> Student Requests
          </div>
          <div className="stat-value">{studentCallsCount}</div>
          <small className="stat-note">Ready to add to roster</small>
        </article>
      </div>

      <div className="filters" style={{ gridTemplateColumns: "2fr 1fr auto" }}>
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search recent calls and transcripts"
            placeholder="Search by caller phone, student name, or spoken words…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter calls"
          value={channelFilter}
          onChange={(e) =>
            setChannelFilter(e.target.value as "all" | "sarvam_voice_call" | "rabata_web_chatbot")
          }
        >
          <option value="all">All Conversations ({allCalls.length})</option>
          <option value="sarvam_voice_call">Phone Calls ({phoneCallsCount})</option>
          <option value="rabata_web_chatbot">
            Website Chat ({allCalls.length - phoneCallsCount})
          </option>
        </select>
        <Button variant="outline" size="sm" onClick={() => void refreshFromServer()}>
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh Calls
        </Button>
      </div>

      {filteredCalls.length === 0 ? (
        <div className="empty-state">No recent calls match your search.</div>
      ) : (
        <div className="grid gap-4">
          {filteredCalls.map((call) => {
            const isOpen = expandedCallId === call.id;
            const vars = call.output_agent_variables;
            const langName = formatLanguageLabel(call.detected_language, vars.language);
            const intentLabel =
              vars.kind === "student"
                ? "Student Registration"
                : vars.kind === "volunteer"
                  ? "Volunteer Application"
                  : "General Enquiry";

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
                            <Phone size={11} /> Phone Call
                          </>
                        ) : (
                          <>
                            <MessageCircle size={11} /> Website Chat
                          </>
                        )}
                      </span>
                      <span className="pill-badge">{intentLabel}</span>
                      <span className="pill-badge">{langName}</span>
                      {call.status === "enrolled" && (
                        <span className="pill-badge pill-green">Added to Students</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(call.start_datetime).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {formatDuration(call.duration)}
                      </span>
                    </div>

                    <h3 className="mt-2 text-base font-semibold">
                      {vars.name} ·{" "}
                      <span className="font-normal text-muted-foreground">
                        {call.user_phone_number}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {vars.classLevel ? `Class ${vars.classLevel} · ` : ""}
                      {vars.subjects ? `${vars.subjects} · ` : ""}
                      {vars.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedCallId(isOpen ? null : call.id)}
                    >
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isOpen ? "Hide Transcript" : "Read Transcript"}
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
                    <div className="text-[11px] font-semibold text-primary">
                      Full Call Conversation Transcript ({langName})
                    </div>
                    {call.interaction_transcript.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{vars.message}</p>
                    ) : (
                      call.interaction_transcript.map((turn) => (
                        <div key={`${call.id}-${turn.turn_id}`} className="transcript-turn">
                          <strong
                            className={`block mb-1 ${
                              turn.role === "agent" ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {turn.role === "agent" ? "Rabata Helpline" : "Caller"}
                          </strong>
                          {turn.indic_text && (
                            <div className="text-foreground font-medium mb-1">
                              {turn.indic_text}
                            </div>
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
      )}
    </div>
  );
}
