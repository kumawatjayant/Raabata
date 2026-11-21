import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { ENGLISH_TUTOR_SYSTEM_PROMPT } from "./lib/english-tutor";
import {
  normalizeSarvamWebhookObject,
  RABATA_SARVAM_SYSTEM_PROMPT,
  type SarvamCallRecord,
} from "./lib/sarvam-agent";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
let cachedAppId: string | undefined;
let localEnvCache: Record<string, string> | undefined;
const recentServerCalls: SarvamCallRecord[] = [];

async function loadLocalEnvFile(): Promise<Record<string, string>> {
  if (localEnvCache) return localEnvCache;
  const parsed: Record<string, string> = {};
  if (typeof process === "undefined" || Boolean(process.env["VERCEL"]) || !process.versions?.node) {
    localEnvCache = parsed;
    return parsed;
  }
  try {
    const [{ readFile }, { resolve }] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    for (const filename of [".env", ".env.local"]) {
      try {
        const content = await readFile(resolve(process.cwd(), filename), "utf8");
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line || line.startsWith("#")) continue;
          const eqIdx = line.indexOf("=");
          if (eqIdx <= 0) continue;
          const key = line.slice(0, eqIdx).trim();
          let val = line.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          parsed[key] = val;
        }
      } catch {
        // file may not exist
      }
    }
  } catch (err) {
    console.warn("[server env]", err);
  }
  localEnvCache = parsed;
  return parsed;
}

async function getServerEnv(name: string): Promise<string> {
  const fromProcess = typeof process !== "undefined" ? process.env[name]?.trim() : undefined;
  if (fromProcess) return fromProcess;
  const localMap = await loadLocalEnvFile();
  return (localMap[name] ?? "").trim();
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function resolveSamvaadAppId(
  apiKey: string,
  orgId: string,
  workspaceId: string,
): Promise<string | null> {
  const configured = await getServerEnv("SARVAM_APP_ID");
  if (configured) return configured;
  if (cachedAppId) return cachedAppId;

  try {
    const url = `https://apps.sarvam.ai/api/app-authoring/v1/orgs/${encodeURIComponent(orgId)}/workspaces/${encodeURIComponent(workspaceId)}/deployments`;
    const res = await fetch(url, { headers: { "X-API-Key": apiKey } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{ app_id?: string; status?: string; phone_numbers?: string[] }>;
    };
    const items = json.items ?? [];
    const matched =
      items.find((d) => d.phone_numbers?.includes("+917965481661")) ??
      items.find((d) => d.status === "active") ??
      items[0];
    if (matched?.app_id) {
      cachedAppId = matched.app_id;
      return matched.app_id;
    }
  } catch {
    // ignore discovery failures
  }
  return null;
}

async function fetchLiveSarvamInteractions(): Promise<{
  liveConnected: boolean;
  calls: SarvamCallRecord[];
}> {
  const apiKey =
    (await getServerEnv("SARVAM_SAMVAAD_API_KEY")) || (await getServerEnv("SARVAM_API_KEY"));
  const orgId = await getServerEnv("SARVAM_ORG_ID");
  const workspaceId = await getServerEnv("SARVAM_WORKSPACE_ID");

  if (!apiKey || !orgId || !workspaceId) {
    return { liveConnected: false, calls: [] };
  }

  const appId = await resolveSamvaadAppId(apiKey, orgId, workspaceId);
  if (!appId) {
    return { liveConnected: false, calls: [] };
  }

  try {
    const now = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const analyticsUrl = new URL(
      `https://apps.sarvam.ai/api/analytics/v1/${encodeURIComponent(orgId)}/${encodeURIComponent(workspaceId)}/${encodeURIComponent(appId)}/interactions`,
    );
    analyticsUrl.searchParams.set("start_datetime", thirtyDaysAgo);
    analyticsUrl.searchParams.set("end_datetime", now);
    analyticsUrl.searchParams.set("include_transcript", "true");
    analyticsUrl.searchParams.set("limit", "50");

    const res = await fetch(analyticsUrl.toString(), {
      headers: { "X-API-Key": apiKey },
    });
    if (!res.ok) {
      return { liveConnected: false, calls: [] };
    }
    const json = (await res.json()) as Record<string, unknown>;
    const rawList = Array.isArray(json["items"])
      ? json["items"]
      : Array.isArray(json["interactions"])
        ? json["interactions"]
        : Array.isArray(json["data"])
          ? json["data"]
          : [];

    const calls = (rawList as Array<Record<string, unknown>>)
      .map((item) => normalizeSarvamWebhookObject(item))
      .sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());

    return { liveConnected: true, calls };
  } catch (err) {
    console.error("[Sarvam Analytics Fetch]", err);
    return { liveConnected: false, calls: [] };
  }
}

async function verifySarvamSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
    const bytes = new Uint8Array(mac);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const b64 = btoa(String.fromCharCode(...bytes));
    return signature === hex || signature === b64 || signature === `sha256=${hex}`;
  } catch {
    return false;
  }
}

async function handleApiRoute(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/sarvam-webhook" && request.method === "POST") {
    const rawBody = await request.text();
    const secret = await getServerEnv("SARVAM_WEBHOOK_SECRET");
    if (secret) {
      const sig = request.headers.get("Sarvam-Signature") ?? "";
      const ts = request.headers.get("Sarvam-Timestamp") ?? "";
      const valid = sig && ts && (await verifySarvamSignature(secret, ts, rawBody, sig));
      if (!valid) {
        return jsonResponse({ ok: false, error: "Invalid Sarvam-Signature" }, 401);
      }
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON payload" }, 400);
    }

    const record = normalizeSarvamWebhookObject(payload);
    recentServerCalls.unshift(record);
    if (recentServerCalls.length > 100) recentServerCalls.length = 100;

    let persistedToSupabase = false;
    const supabaseUrl = await getServerEnv("SUPABASE_URL");
    const serviceRoleKey = await getServerEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRoleKey) {
      try {
        const { supabaseAdmin } = await import("./integrations/supabase/client.server");
        const vars = record.output_agent_variables;
        const { error } = await supabaseAdmin.rpc("submit_enquiry", {
          p_kind: vars.kind,
          p_name: vars.name,
          p_email: vars.email,
          p_consent: true,
          p_details: {
            channel: record.channel === "rabata_web_chatbot" ? "Website Chat" : "Phone Call",
            interaction_id: record.interaction_id,
            caller: record.user_phone_number,
            agent_phone_number: record.agent_phone_number,
            duration: String(record.duration),
            classLevel: vars.classLevel ?? "",
            subjects: vars.subjects ?? "",
            language: vars.language ?? "",
            format: vars.format ?? "",
            message: vars.message,
            interaction_transcript: JSON.stringify(record.interaction_transcript),
          },
        });
        persistedToSupabase = !error;
      } catch (err) {
        console.error("[Sarvam Webhook DB]", err);
      }
    }

    return jsonResponse({
      ok: true,
      interaction_id: record.interaction_id,
      persistedToSupabase,
      record,
    });
  }

  if (path === "/api/sarvam-calls" && request.method === "GET") {
    const live = await fetchLiveSarvamInteractions();
    const seen = new Set<string>();
    const merged: SarvamCallRecord[] = [];
    for (const item of [...recentServerCalls, ...live.calls]) {
      if (!seen.has(item.interaction_id)) {
        seen.add(item.interaction_id);
        merged.push(item);
      }
    }
    return jsonResponse({
      ok: true,
      liveConnected: live.liveConnected,
      calls: merged,
    });
  }

  if (path === "/api/english-tutor/config" && request.method === "GET") {
    const tutorAppId = await getServerEnv("SARVAM_TUTOR_APP_ID");
    return jsonResponse({
      ok: true,
      tutorAgentConfigured: Boolean(tutorAppId),
      tutorAppId: tutorAppId || null,
    });
  }

  if (path === "/api/english-tutor" && request.method === "POST") {
    const rawKey =
      (await getServerEnv("SARVAM_CHAT_API_KEY")) || (await getServerEnv("SARVAM_API_KEY"));
    if (!rawKey || rawKey.startsWith("sk_sam")) {
      return jsonResponse({ ok: false, mode: "local_fallback" }, 200);
    }
    try {
      const body = (await request.json()) as {
        messages?: Array<{ role: "user" | "assistant"; content: string }>;
      };
      const chatMessages = [
        { role: "system", content: ENGLISH_TUTOR_SYSTEM_PROMPT },
        ...(body.messages ?? []).slice(-12),
      ];
      const chatModel = (await getServerEnv("SARVAM_CHAT_MODEL")) || "sarvam-105b";
      const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": rawKey,
        },
        body: JSON.stringify({
          model: chatModel,
          messages: chatMessages,
          temperature: 0.65,
          max_tokens: 320,
        }),
      });
      if (!res.ok) {
        return jsonResponse({ ok: false, mode: "local_fallback" }, 200);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawContent = json.choices?.[0]?.message?.content?.trim();
      if (!rawContent) {
        return jsonResponse({ ok: false, mode: "local_fallback" }, 200);
      }
      try {
        const stripped = rawContent
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        const parsed = JSON.parse(stripped) as {
          reply?: unknown;
          correction?: { original?: unknown; better?: unknown; tip?: unknown } | null;
        };
        const replyText = typeof parsed.reply === "string" ? parsed.reply.trim() : rawContent;
        const corr = parsed.correction;
        const validCorrection =
          corr &&
          typeof corr.original === "string" &&
          typeof corr.better === "string" &&
          corr.original.trim() &&
          corr.better.trim()
            ? {
                original: corr.original.trim(),
                better: corr.better.trim(),
                tip: typeof corr.tip === "string" ? corr.tip.trim() : "",
              }
            : undefined;
        return jsonResponse({
          ok: true,
          mode: "sarvam_api",
          reply: replyText,
          ...(validCorrection ? { correction: validCorrection } : {}),
        });
      } catch {
        return jsonResponse({ ok: true, mode: "sarvam_api", reply: rawContent });
      }
    } catch {
      return jsonResponse({ ok: false, mode: "local_fallback" }, 200);
    }
  }

  if (path === "/api/sarvam-chat" && request.method === "POST") {
    const rawKey =
      (await getServerEnv("SARVAM_CHAT_API_KEY")) || (await getServerEnv("SARVAM_API_KEY"));
    if (!rawKey || rawKey.startsWith("sk_sam")) {
      return jsonResponse({ ok: false, mode: "local_fallback" }, 200);
    }
    try {
      const body = (await request.json()) as {
        messages?: Array<{ role: "user" | "assistant"; content: string }>;
      };
      const chatMessages = [
        {
          role: "system",
          content: `${RABATA_SARVAM_SYSTEM_PROMPT}\n\nSpeak naturally like a warm, helpful human team member in 1-3 friendly sentences.`,
        },
        ...(body.messages ?? []).slice(-10),
      ];
      const chatModel = (await getServerEnv("SARVAM_CHAT_MODEL")) || "sarvam-105b";
      const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": rawKey,
        },
        body: JSON.stringify({
          model: chatModel,
          messages: chatMessages,
          temperature: 0.55,
          max_tokens: 350,
        }),
      });
      if (!res.ok) {
        return jsonResponse({ ok: false, mode: "local_fallback" }, 200);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        return jsonResponse({ ok: false, mode: "local_fallback" }, 200);
      }
      return jsonResponse({ ok: true, mode: "sarvam_api", reply });
    } catch {
      return jsonResponse({ ok: false, mode: "local_fallback" }, 200);
    }
  }

  return null;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await handleApiRoute(request);
      if (apiResponse) return apiResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
