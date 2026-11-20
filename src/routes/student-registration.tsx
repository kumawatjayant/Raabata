import { createFileRoute } from "@tanstack/react-router";
import { Phone, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/site-shell";
import { EnquiryForm } from "@/components/enquiry-form";
import { useLanguage } from "@/lib/i18n";
import { pageHead, site } from "@/lib/site";

export const Route = createFileRoute("/student-registration")({
  head: () =>
    pageHead(
      "Student Registration",
      "Register interest in Rabata’s free educational support. Parents and guardians can safely request support for a child.",
    ),
  component: Students,
});

function Students() {
  const { t } = useLanguage();
  const r = t.registrationPage;

  return (
    <>
      <PageHeading eyebrow={r.eyebrow} title={r.title} description={r.description} />
      <section className="section">
        <div className="container form-layout">
          <div className="form-aside">
            <h2>
              {r.asideHeadingLine1}
              <br />
              {r.asideHeadingLine2}
            </h2>
            <p>{r.asideBody1}</p>
            <div className="contact-detail">
              <Phone size={18} />
              <div>
                <small>Prefer calling by phone? (Hindi · Punjabi · English)</small>
                <a href={`tel:${site.phone}`} className="font-semibold text-foreground">
                  Call Rabata Helpline: {site.phoneDisplay}
                </a>
              </div>
            </div>
            <p>
              <ShieldCheck className="inline mr-2" size={17} />
              {r.asideBody2}
            </p>
            <p>{r.asideBody3}</p>
          </div>
          <EnquiryForm kind="student" />
        </div>
      </section>
    </>
  );
}
