import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  normalizeSarvamWebhookObject,
  RABATA_SARVAM_SYSTEM_PROMPT,
  type SarvamCallRecord,
} from "./lib/sarvam-agent";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
const recentServerCalls: SarvamCallRecord[] = [];

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
    const secret = process.env["SARVAM_WEBHOOK_SECRET"];
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
    if (process.env["SUPABASE_URL"] && process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      try {
        const { supabaseAdmin } = await import("./integrations/supabase/client.server");
        const vars = record.output_agent_variables;
        const { error } = await supabaseAdmin.rpc("submit_enquiry", {
          p_kind: vars.kind,
          p_name: vars.name,
          p_email: vars.email,
          p_consent: true,
          p_details: {
            channel:
              record.channel === "rabata_web_chatbot"
                ? "Web AI Chatbot (Sarvam)"
                : "Sarvam AI Voice Call",
            interaction_id: record.interaction_id,
            app_id: record.app_id,
            deployment_id: record.deployment_id,
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
    return jsonResponse({ ok: true, calls: recentServerCalls });
  }

  if (path === "/api/sarvam-sync" && request.method === "POST") {
    try {
      const body = (await request.json()) as {
        orgId?: string;
        workspaceId?: string;
        appId?: string;
        apiKey?: string;
        startDatetime?: string;
        endDatetime?: string;
      };
      const apiKey = body.apiKey?.trim() || process.env["SARVAM_API_KEY"] || "";
      if (!apiKey || !body.orgId || !body.workspaceId || !body.appId) {
        return jsonResponse(
          { ok: false, error: "orgId, workspaceId, appId, and Sarvam X-API-Key are required." },
          400,
        );
      }
      const endIso = body.endDatetime || new Date().toISOString();
      const startIso =
        body.startDatetime || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const analyticsUrl = new URL(
        `https://apps.sarvam.ai/api/analytics/v1/${encodeURIComponent(body.orgId)}/${encodeURIComponent(body.workspaceId)}/${encodeURIComponent(body.appId)}/interactions`,
      );
      analyticsUrl.searchParams.set("start_datetime", startIso);
      analyticsUrl.searchParams.set("end_datetime", endIso);
      analyticsUrl.searchParams.set("include_transcript", "true");
      analyticsUrl.searchParams.set("limit", "50");

      const upstream = await fetch(analyticsUrl.toString(), {
        headers: { "X-API-Key": apiKey },
      });
      if (!upstream.ok) {
        const text = await upstream.text().catch(() => "");
        return jsonResponse(
          {
            ok: false,
            error: `Sarvam Analytics returned HTTP ${upstream.status}: ${text.slice(0, 200)}`,
          },
          upstream.status,
        );
      }
      const data = (await upstream.json()) as Record<string, unknown>;
      const rawList = Array.isArray(data["interactions"])
        ? data["interactions"]
        : Array.isArray(data["data"])
          ? data["data"]
          : Array.isArray(data)
            ? data
            : [];
      const imported = (rawList as Array<Record<string, unknown>>).map((item) =>
        normalizeSarvamWebhookObject(item),
      );
      for (const rec of imported) {
        if (!recentServerCalls.some((c) => c.interaction_id === rec.interaction_id)) {
          recentServerCalls.unshift(rec);
        }
      }
      return jsonResponse({ ok: true, count: imported.length, calls: imported });
    } catch {
      return jsonResponse({ ok: false, error: "Unable to query Sarvam Analytics API." }, 502);
    }
  }

  if (path === "/api/sarvam-chat" && request.method === "POST") {
    const apiKey = process.env["SARVAM_API_KEY"];
    if (!apiKey) {
      return jsonResponse({ ok: false, mode: "local_fallback" }, 200);
    }
    try {
      const body = (await request.json()) as {
        messages?: Array<{ role: "user" | "assistant"; content: string }>;
      };
      const chatMessages = [
        { role: "system", content: RABATA_SARVAM_SYSTEM_PROMPT },
        ...(body.messages ?? []).slice(-10),
      ];
      const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey,
        },
        body: JSON.stringify({
          model: process.env["SARVAM_CHAT_MODEL"] || "sarvam-105b",
          messages: chatMessages,
          temperature: 0.4,
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
