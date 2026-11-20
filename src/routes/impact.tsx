import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Award, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeading } from "@/components/site-shell";
import { pageHead } from "@/lib/site";
import { fetchPublishedStories, STORY_FOCUS_AREAS } from "@/lib/platform";

export const Route = createFileRoute("/impact")({
  head: () =>
    pageHead(
      "Our Impact & Success Stories",
      "Explore Rabata’s grassroots reach, mentorship model and real, safeguarding-compliant student success stories.",
    ),
  component: Impact,
});

function Impact() {
  const [focusFilter, setFocusFilter] = useState<string>("All journeys");

  const storiesQuery = useQuery({
    queryKey: ["success-stories"],
    queryFn: fetchPublishedStories,
  });

  const stories = storiesQuery.data ?? [];
  const filteredStories = stories.filter(
    (s) => focusFilter === "All journeys" || s.focus_area === focusFilter,
  );

  return (
    <>
      <PageHeading
        eyebrow="Real support. Honest stories."
        title="Change begins with one learner."
        description="We are a small grassroots initiative. We measure our purpose in the care we give, the confidence we build and the real progress young learners achieve."
      />

      <section className="section">
        <div className="container intro-grid">
          <div>
            <div className="eyebrow">Our current reach</div>
            <h2>
              10–15 children.
              <br />
              Individual attention.
            </h2>
            <p className="section-copy">
              Approximately 10–15 students receive educational support, as reported in Rabata’s
              organization profile. This is an approximate organization-reported figure, not an
              independently audited count.
            </p>
          </div>
          <div className="prose">
            <h2>Personally taught. Personally supported.</h2>
            <p>
              Tammana and Rabata mentors directly teach and guide learners. This helps us understand
              each child’s needs, challenges and learning progress.
            </p>
            <p>
              Academic support, communication practice and practical life skills all belong to the
              same journey: education → skills → confidence → opportunity → independence.
            </p>
          </div>
        </div>
      </section>

      <section id="success-stories" className="section section-soft">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <Award size={13} /> Success stories
              </div>
              <h2>Journeys of growth &amp; resilience</h2>
              <p className="section-copy">
                Highlighting how patient mentorship and free educational support make a real
                difference. Student identities remain anonymous unless explicit guardian consent is
                verified.
              </p>
            </div>
            <Link to="/admin" className="text-link">
              Admin: Publish verified story <ArrowRight size={15} />
            </Link>
          </div>

          <div className="filters" style={{ gridTemplateColumns: "minmax(220px, 340px)" }}>
            <select
              aria-label="Filter success stories by focus area"
              value={focusFilter}
              onChange={(e) => setFocusFilter(e.target.value)}
            >
              <option>All journeys</option>
              {STORY_FOCUS_AREAS.map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="story-grid">
            {filteredStories.map((story) => (
              <article key={story.id} className="story-card">
                {story.image_url && (
                  <img
                    src={story.image_url}
                    alt={story.title}
                    className="story-image"
                    loading="lazy"
                  />
                )}
                <div className="story-body">
                  <div className="ledger-badges">
                    <span className="pill-badge pill-green">
                      <Sparkles size={11} /> {story.focus_area}
                    </span>
                    <span className="pill-badge">
                      <ShieldCheck size={11} />{" "}
                      {story.is_anonymous ? "Identity Protected" : "Guardian Consent Verified"}
                    </span>
                  </div>
                  <div className="story-learner mt-3">
                    <strong>
                      {story.is_anonymous ? "Anonymous Learner" : story.learner_display_name}
                    </strong>
                    {story.class_or_age && <span> · {story.class_or_age}</span>}
                  </div>
                  <h3 className="mt-2 text-xl font-medium">{story.title}</h3>
                  <p className="mt-3 text-xs text-muted-foreground">
                    <strong className="text-foreground">Journey &amp; context:</strong>{" "}
                    {story.story_summary}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <strong className="text-foreground">Rabata’s support:</strong>{" "}
                    {story.support_given}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <strong className="text-foreground">Progress &amp; milestone:</strong>{" "}
                    {story.achievement_or_progress}
                  </p>
                  {story.quote && (
                    <blockquote className="story-quote mt-4">“{story.quote}”</blockquote>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-6">
            <Link to="/volunteer" className="text-link">
              Help a learner take their next step <ArrowRight size={16} />
            </Link>
            <Link to="/funds" className="text-link">
              See how funds support these journeys <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
