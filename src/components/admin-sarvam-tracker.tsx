import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  MessageCircle,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { AdminModal } from "@/components/admin-modal";
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
  const [activeCall, setActiveCall] = useState<SarvamCallRecord | null>(null);
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

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Caller</th>
              <th>Phone / Contact</th>
              <th>Channel</th>
              <th>Language</th>
              <th>Request Type</th>
              <th>Duration</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted-foreground py-8">
                  No recent calls match your search.
                </td>
              </tr>
            ) : (
              filteredCalls.map((call) => {
                const vars = call.output_agent_variables;
                const langName = formatLanguageLabel(call.detected_language, vars.language);
                const intentLabel =
                  vars.kind === "student"
                    ? "Student Registration"
                    : vars.kind === "volunteer"
                      ? "Volunteer"
                      : "Enquiry";

                return (
                  <tr key={call.id}>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(call.start_datetime).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <strong>{vars.name}</strong>
                      {(vars.classLevel || vars.subjects) && (
                        <div className="text-xs text-muted-foreground">
                          {vars.classLevel ? `Class ${vars.classLevel}` : ""}
                          {vars.classLevel && vars.subjects ? " · " : ""}
                          {vars.subjects ?? ""}
                        </div>
                      )}
                    </td>
                    <td className="text-xs">{call.user_phone_number}</td>
                    <td>
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
                            <MessageCircle size={11} /> Web Chat
                          </>
                        )}
                      </span>
                    </td>
                    <td>{langName}</td>
                    <td>
                      <span className="pill-badge">{intentLabel}</span>
                    </td>
                    <td className="whitespace-nowrap">{formatDuration(call.duration)}</td>
                    <td>
                      <span
                        className={`pill-badge ${call.status === "enrolled" ? "pill-green" : ""}`}
                      >
                        {call.status === "enrolled" ? "Added to Students" : "Received"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setActiveCall(call)}>
                          View Transcript
                        </Button>
                        {vars.kind === "student" && call.status !== "enrolled" && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              await onEnrollCall(call);
                              setLocalCalls(updateSarvamCallStatus(call.id, "enrolled"));
                            }}
                          >
                            <UserPlus size={13} /> Enroll
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={Boolean(activeCall)}
        title={
          activeCall
            ? `Call Transcript · ${activeCall.output_agent_variables.name}`
            : "Call Transcript"
        }
        subtitle={
          activeCall
            ? `${activeCall.user_phone_number} · ${formatLanguageLabel(
                activeCall.detected_language,
                activeCall.output_agent_variables.language,
              )} · ${formatDuration(activeCall.duration)}`
            : ""
        }
        onClose={() => setActiveCall(null)}
      >
        {activeCall && (
          <div className="space-y-4">
            <div className="border rounded-lg p-3 bg-muted text-xs space-y-1">
              <div>
                <strong>Summary:</strong> {activeCall.output_agent_variables.message}
              </div>
              {activeCall.output_agent_variables.email && (
                <div>
                  <strong>Email:</strong> {activeCall.output_agent_variables.email}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {activeCall.interaction_transcript.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {activeCall.output_agent_variables.message}
                </p>
              ) : (
                activeCall.interaction_transcript.map((turn) => (
                  <div key={`${activeCall.id}-${turn.turn_id}`} className="transcript-turn">
                    <strong
                      className={`block mb-1 ${
                        turn.role === "agent" ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {turn.role === "agent" ? "Rabata Helpline" : "Caller"}
                    </strong>
                    {turn.indic_text && (
                      <div className="text-foreground font-medium mb-1">{turn.indic_text}</div>
                    )}
                    <div className="text-muted-foreground">{turn.en_text}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveCall(null)}>
                Close
              </Button>
              {activeCall.output_agent_variables.kind === "student" &&
                activeCall.status !== "enrolled" && (
                  <Button
                    onClick={async () => {
                      const target = activeCall;
                      await onEnrollCall(target);
                      setLocalCalls(updateSarvamCallStatus(target.id, "enrolled"));
                      setActiveCall(null);
                    }}
                  >
                    <UserPlus size={14} /> Enroll as Student
                  </Button>
                )}
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
