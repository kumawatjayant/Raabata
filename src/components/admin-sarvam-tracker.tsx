import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  FileText,
  MessageCircle,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { AdminModal } from "@/components/admin-modal";
import { Button } from "@/components/ui/button";
import type { RoleRow } from "@/lib/access";
import type { AdminEnquiryItem } from "@/lib/enquiries.functions";
import {
  convertEnquiriesToSarvamCalls,
  extractStudentDraftFromCall,
  readStoredWebCalls,
  SEEDED_SARVAM_CALLS,
  type SarvamCallRecord,
} from "@/lib/sarvam-agent";
import { formatClassLabel } from "@/lib/platform";
import { site } from "@/lib/site";

type CallsAndEnquiriesView =
  "all" | "sarvam_voice_call" | "rabata_web_chatbot" | "website_enquiries" | "access_approvals";

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
  roles,
  names,
  enrolledInteractionIds,
  onReviewRole,
  onRequestEnrollCall,
  onRequestEnrollEnquiry,
  onRefreshAll,
}: {
  dbEnquiries: AdminEnquiryItem[];
  roles: RoleRow[];
  names: Record<string, string>;
  enrolledInteractionIds: string[];
  onReviewRole: (id: string, decision: "active" | "rejected") => void;
  onRequestEnrollCall: (call: SarvamCallRecord) => void;
  onRequestEnrollEnquiry: (enquiry: AdminEnquiryItem) => void;
  onRefreshAll?: () => void;
}) {
  const [localCalls, setLocalCalls] = useState<SarvamCallRecord[]>([]);
  const [serverCalls, setServerCalls] = useState<SarvamCallRecord[]>([]);
  const [liveConnected, setLiveConnected] = useState(false);
  const [viewFilter, setViewFilter] = useState<CallsAndEnquiriesView>("all");
  const [search, setSearch] = useState("");
  const [activeCall, setActiveCall] = useState<SarvamCallRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshFromServer() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/sarvam-calls");
      if (res.ok) {
        const body = (await res.json()) as {
          ok?: boolean;
          liveConnected?: boolean;
          calls?: SarvamCallRecord[];
        };
        if (body.ok && Array.isArray(body.calls)) {
          setServerCalls(body.calls);
          setLiveConnected(Boolean(body.liveConnected));
        }
      }
      onRefreshAll?.();
    } catch {
      // ignore offline preview errors
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setLocalCalls(readStoredWebCalls());
    void refreshFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allCalls = useMemo(() => {
    const dbDerived = convertEnquiriesToSarvamCalls(dbEnquiries);
    const seen = new Set<string>();
    const combined: SarvamCallRecord[] = [];
    const fallbackCalls = liveConnected ? [] : SEEDED_SARVAM_CALLS;
    for (const item of [...serverCalls, ...dbDerived, ...localCalls, ...fallbackCalls]) {
      if (!seen.has(item.interaction_id)) {
        seen.add(item.interaction_id);
        combined.push(item);
      }
    }
    return combined;
  }, [dbEnquiries, liveConnected, localCalls, serverCalls]);

  const query = search.trim().toLowerCase();

  const filteredCalls = allCalls.filter((c) => {
    const matchesChannel =
      viewFilter === "all" ||
      (viewFilter === "sarvam_voice_call" && c.channel === "sarvam_voice_call") ||
      (viewFilter === "rabata_web_chatbot" && c.channel === "rabata_web_chatbot");
    const text =
      `${c.user_phone_number} ${c.output_agent_variables.name} ${c.output_agent_variables.email} ${c.output_agent_variables.subjects ?? ""} ${JSON.stringify(c.interaction_transcript)}`.toLowerCase();
    return matchesChannel && (!query || text.includes(query));
  });

  const filteredEnquiries = dbEnquiries.filter((item) => {
    if (!query) return true;
    const text =
      `${item.name} ${item.email} ${item.kind} ${item.details["classLevel"] ?? ""} ${item.details["subjects"] ?? ""} ${item.details["message"] ?? ""}`.toLowerCase();
    return text.includes(query);
  });

  const nonAdminRoles = roles.filter((r) => r.role !== "admin");
  const filteredRoles = nonAdminRoles.filter((r) => {
    if (!query) return true;
    const text = `${names[r.user_id] || ""} ${r.role} ${r.status}`.toLowerCase();
    return text.includes(query);
  });

  const phoneCallsCount = allCalls.filter((c) => c.channel === "sarvam_voice_call").length;
  const studentCallsCount = allCalls.filter(
    (c) => c.output_agent_variables.kind === "student",
  ).length;
  const pendingRoleCount = nonAdminRoles.filter((r) => r.status === "pending").length;
  const avgDuration =
    allCalls.length > 0
      ? Math.round(allCalls.reduce((sum, c) => sum + Number(c.duration || 0), 0) / allCalls.length)
      : 0;

  const activeCallIsEnrolled = Boolean(
    activeCall &&
    (activeCall.status === "enrolled" ||
      enrolledInteractionIds.includes(activeCall.interaction_id)),
  );

  return (
    <div className="space-y-6">
      <div className="stat-cards">
        <article className="stat-card">
          <div className="stat-label">
            <Phone size={15} /> Helpline Number
          </div>
          <div className="stat-value is-compact">{site.phoneDisplay}</div>
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
          <small className="stat-note">
            {dbEnquiries.length} web enquiries · {pendingRoleCount} pending{" "}
            {pendingRoleCount === 1 ? "approval" : "approvals"}
          </small>
        </article>
      </div>

      <div className="admin-control-bar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search recent calls, enquiries, and approvals"
            placeholder="Search by caller, name, email, or spoken words…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter calls and enquiries"
          className="admin-control-select"
          value={viewFilter}
          onChange={(e) => setViewFilter(e.target.value as CallsAndEnquiriesView)}
        >
          <option value="all">All Conversations ({allCalls.length})</option>
          <option value="sarvam_voice_call">Phone Calls ({phoneCallsCount})</option>
          <option value="rabata_web_chatbot">
            Website Chat ({allCalls.length - phoneCallsCount})
          </option>
          <option value="website_enquiries">Website Enquiries ({dbEnquiries.length})</option>
          <option value="access_approvals">Access Approvals ({nonAdminRoles.length})</option>
        </select>
        <div className="admin-control-actions">
          <button
            type="button"
            className="admin-action-btn admin-action-btn-secondary admin-toolbar-btn"
            onClick={() => void refreshFromServer()}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh Calls
          </button>
        </div>
      </div>

      {viewFilter === "website_enquiries" ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name &amp; Email</th>
                <th>Type</th>
                <th>Details / Message</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">
                    No website enquiries match your filter yet.
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <strong>{item.name}</strong>
                      <div className="text-xs text-muted-foreground">{item.email}</div>
                    </td>
                    <td>
                      <span className="pill-badge pill-green capitalize">{item.kind}</span>
                    </td>
                    <td className="text-xs text-muted-foreground" style={{ maxWidth: 420 }}>
                      {item.details["classLevel"] ? `Class ${item.details["classLevel"]} · ` : ""}
                      {item.details["subjects"] ? `${item.details["subjects"]} · ` : ""}
                      {item.details["message"] ?? ""}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {item.kind === "student" && (
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-action-btn admin-action-btn-primary"
                            onClick={() => onRequestEnrollEnquiry(item)}
                          >
                            <UserPlus size={13} /> Enroll
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : viewFilter === "access_approvals" ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role Requested</th>
                <th>Status</th>
                <th>Requested Date</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">
                    No account access requests match your search.
                  </td>
                </tr>
              ) : (
                filteredRoles.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{names[r.user_id] || "Unnamed account"}</strong>
                    </td>
                    <td>
                      <span className="pill-badge capitalize">{r.role}</span>
                    </td>
                    <td>
                      <span className={`pill-badge ${r.status === "active" ? "pill-green" : ""}`}>
                        {r.status === "active" ? "Approved" : r.status}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(r.requested_at).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {r.status === "pending" && (
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-action-btn admin-action-btn-success"
                            onClick={() => onReviewRole(r.id, "active")}
                          >
                            <Check size={13} /> Approve
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn admin-action-btn-secondary"
                            onClick={() => onReviewRole(r.id, "rejected")}
                          >
                            <X size={13} /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Caller &amp; Details</th>
                <th>Channel</th>
                <th>Request &amp; Language</th>
                <th>Duration</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground py-8">
                    No recent calls match your search.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => {
                  const vars = call.output_agent_variables;
                  const draft = extractStudentDraftFromCall(call);
                  const langName = formatLanguageLabel(
                    call.detected_language,
                    draft.preferred_language,
                  );
                  const intentLabel =
                    vars.kind === "student"
                      ? "Student Registration"
                      : vars.kind === "volunteer"
                        ? "Volunteer"
                        : "Enquiry";
                  const isEnrolled =
                    call.status === "enrolled" ||
                    enrolledInteractionIds.includes(call.interaction_id);

                  const primaryTitle =
                    draft.first_name || draft.guardian_phone || draft.guardian_email || vars.name;
                  const contactLine = [
                    draft.guardian_phone && draft.guardian_phone !== primaryTitle
                      ? draft.guardian_phone
                      : "",
                    draft.guardian_email && draft.guardian_email !== primaryTitle
                      ? draft.guardian_email
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const summaryLine = [
                    draft.class_level ? formatClassLabel(draft.class_level) : "",
                    draft.subjects_needed,
                  ]
                    .filter(Boolean)
                    .join(" · ");

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
                      <td style={{ maxWidth: 280 }}>
                        <strong className="text-foreground">{primaryTitle}</strong>
                        {contactLine && (
                          <div className="text-xs text-muted-foreground mt-0.5">{contactLine}</div>
                        )}
                        {summaryLine && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {summaryLine}
                          </div>
                        )}
                      </td>
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
                      <td>
                        <span className="pill-badge">{intentLabel}</span>
                        <div className="text-[11px] text-muted-foreground mt-1">{langName}</div>
                      </td>
                      <td className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDuration(call.duration)}
                      </td>
                      <td>
                        <span className={`pill-badge ${isEnrolled ? "pill-green" : ""}`}>
                          {isEnrolled ? (
                            <>
                              <CheckCircle2 size={11} /> Enrolled
                            </>
                          ) : (
                            "Received"
                          )}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-action-btn admin-action-btn-secondary"
                            onClick={() => setActiveCall(call)}
                          >
                            <FileText size={13} /> Transcript
                          </button>
                          {vars.kind === "student" && !isEnrolled && (
                            <button
                              type="button"
                              className="admin-action-btn admin-action-btn-primary"
                              onClick={() => onRequestEnrollCall(call)}
                            >
                              <UserPlus size={13} /> Enroll
                            </button>
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
      )}

      <AdminModal
        open={Boolean(activeCall)}
        title={
          activeCall
            ? `Call Transcript · ${
                extractStudentDraftFromCall(activeCall).first_name ||
                activeCall.output_agent_variables.name
              }`
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
              {extractStudentDraftFromCall(activeCall).guardian_email && (
                <div>
                  <strong>Email:</strong> {extractStudentDraftFromCall(activeCall).guardian_email}
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
              {activeCall.output_agent_variables.kind === "student" && !activeCallIsEnrolled && (
                <Button
                  onClick={() => {
                    const target = activeCall;
                    setActiveCall(null);
                    onRequestEnrollCall(target);
                  }}
                >
                  <UserPlus size={14} /> Review &amp; Enroll Student
                </Button>
              )}
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
