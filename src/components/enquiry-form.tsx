import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enquirySchema } from "@/lib/enquiry-schema";
import { submitEnquiry } from "@/lib/enquiries.functions";
import { LANGUAGE_OPTIONS, useLanguage } from "@/lib/i18n";
import { appendLocalEnquiry, isLocalDevHost, makeLocalId } from "@/lib/local-store";

export function EnquiryForm({ kind }: { kind: "contact" | "student" | "volunteer" }) {
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = useServerFn(submitEnquiry);
  const { lang, setLang, t } = useLanguage();
  const f = t.enquiryForm;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const parsed = enquirySchema.safeParse({
      ...values,
      kind,
      consent: values["consent"] === "on",
    });
    if (!parsed.success) {
      setStatus(parsed.error.issues[0]?.message || "Please check your information.");
      return;
    }
    setBusy(true);
    setSuccess(false);
    setStatus("");
    try {
      const result = await submit({ data: parsed.data });
      if (result.success) {
        if (isLocalDevHost()) {
          const { kind: k, name, email, consent, website: _w, ...rest } = parsed.data;
          const details: Record<string, string> = {};
          for (const [dk, dv] of Object.entries(rest)) {
            if (typeof dv === "string" && dv.trim()) details[dk] = dv.trim();
          }
          appendLocalEnquiry({
            id: result.reference || makeLocalId("enq"),
            created_at: new Date().toISOString(),
            kind: k,
            name,
            email,
            details,
            consent,
          });
        }
        setSuccess(true);
        form.reset();
        setStatus(f.successMessage);
      } else {
        setStatus(result.message || "Please try again.");
      }
    } catch {
      setStatus(f.errorFallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Languages size={14} /> {f.languageBanner}
        </span>
        <div className="lang-switcher is-light" role="group" aria-label="Form language">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              className={`lang-btn ${lang === opt.code ? "is-active" : ""}`}
              aria-pressed={lang === opt.code}
              onClick={() => setLang(opt.code)}
            >
              {opt.nativeName}
            </button>
          ))}
        </div>
      </div>

      <h2>
        {kind === "contact"
          ? f.contactHeading
          : kind === "student"
            ? f.studentHeading
            : f.volunteerHeading}
      </h2>

      {status && (
        <div
          role={success ? "status" : "alert"}
          className={`form-status ${success ? "" : "form-error"}`}
        >
          {success && <CheckCircle2 size={18} />} {status}
        </div>
      )}

      <div className="form-grid">
        <label className="field">
          {kind === "student" ? f.studentNameLabel : f.yourNameLabel} *
          <input
            name="name"
            required
            maxLength={100}
            placeholder={kind === "student" ? f.studentNamePlaceholder : f.yourNamePlaceholder}
            autoComplete="name"
          />
        </label>
        <label className="field">
          {kind === "student" ? f.guardianEmailLabel : f.emailLabel} *
          <input
            name="email"
            type="email"
            required
            maxLength={255}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        {kind !== "contact" && (
          <>
            <label className="field">
              {kind === "student" ? `${f.classStudentLabel} *` : f.classVolunteerLabel}
              <select name="classLevel" required={kind === "student"} defaultValue="">
                <option value="" disabled>
                  {f.selectClassOption}
                </option>
                {["1–3", "4–5", "6–8", "9–10", "11–12", "Young adult"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {f.subjectsLabel} *
              <input name="subjects" required maxLength={200} placeholder={f.subjectsPlaceholder} />
            </label>
            <label className="field">
              {kind === "student" ? f.languageStudentLabel : f.languageVolunteerLabel}
              <select name="language">
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="English">English</option>
                <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="Hindi and English">Hindi and English</option>
              </select>
            </label>
            <label className="field">
              {f.formatLabel}
              <select name="format">
                <option value="In person">In person</option>
                <option value="Online">Online</option>
                <option value="Either">Either</option>
              </select>
            </label>
          </>
        )}
        {kind === "volunteer" && (
          <>
            <label className="field wide">
              {f.qualificationsLabel} *
              <input
                name="qualifications"
                required
                maxLength={300}
                placeholder={f.qualificationsPlaceholder}
              />
            </label>
            <label className="field">
              {f.experienceLabel}
              <input name="experience" maxLength={300} placeholder={f.experiencePlaceholder} />
            </label>
            <label className="field">
              {f.availabilityLabel}
              <input name="availability" maxLength={200} placeholder={f.availabilityPlaceholder} />
            </label>
          </>
        )}
        <label className="field wide">
          {kind === "volunteer"
            ? f.messageVolunteerLabel
            : kind === "student"
              ? f.messageStudentLabel
              : f.messageContactLabel}{" "}
          *
          <textarea
            name="message"
            required
            minLength={5}
            maxLength={2000}
            placeholder={
              kind === "contact" ? f.messageContactPlaceholder : f.messageOtherPlaceholder
            }
          />
        </label>
        <label className="honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="consent">
        <input type="checkbox" name="consent" required />
        <span>
          {kind === "student" ? f.consentStudent : f.consentOther} {f.consentPolicyPrefix}{" "}
          <Link to="/privacy" className="underline">
            {f.consentPolicyLink}
          </Link>
          .
        </span>
      </label>

      <Button type="submit" disabled={busy} className="w-full" size="lg">
        {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        {busy
          ? f.sending
          : kind === "contact"
            ? f.submitContact
            : kind === "student"
              ? f.submitStudent
              : f.submitVolunteer}
      </Button>
      <p className="form-fine">{f.finePrint}</p>
    </form>
  );
}
