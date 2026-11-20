import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enquirySchema } from "./enquiry-schema";

export const submitEnquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => enquirySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { kind, name, email, consent, website: _website, ...details } = data;
    const { data: id, error } = await supabaseAdmin.rpc("submit_enquiry", {
      p_kind: kind,
      p_name: name,
      p_email: email.toLowerCase(),
      p_details: details,
      p_consent: consent,
    });
    if (error) {
      return {
        success: false,
        message: error.message.includes("rate_limit")
          ? "Please wait 15 minutes before sending another message."
          : "Your message could not be saved. Please try again or email us directly.",
      };
    }
    try {
      const { notifyEnquiry } = await import("./gmail.server");
      const notification = await notifyEnquiry(data, id);
      return { success: true, reference: id, notificationSent: notification.sent };
    } catch {
      return { success: true, reference: id, notificationSent: false };
    }
  });

export interface AdminEnquiryItem {
  id: string;
  created_at: string;
  kind: "contact" | "student" | "volunteer";
  name: string;
  email: string;
  details: Record<string, string>;
  consent: boolean;
}

export const listEnquiriesForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminEnquiryItem[]> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      throw new Error("Unauthorized: Admin role required");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("enquiries")
      .select("id, created_at, kind, name, email, details, consent")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error("Unable to load enquiries.");
    return (data ?? []).map((row) => {
      const safeDetails: Record<string, string> = {};
      if (row.details && typeof row.details === "object" && !Array.isArray(row.details)) {
        for (const [k, v] of Object.entries(row.details as Record<string, unknown>)) {
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            safeDetails[k] = String(v);
          }
        }
      }
      return {
        id: row.id,
        created_at: row.created_at,
        kind: row.kind as AdminEnquiryItem["kind"],
        name: row.name,
        email: row.email,
        details: safeDetails,
        consent: row.consent,
      };
    });
  });
