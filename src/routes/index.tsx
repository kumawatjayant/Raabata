import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BookOpen,
  Camera,
  GraduationCap,
  Heart,
  IndianRupee,
  Leaf,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import classroom from "@/assets/rabata-classroom.jpeg.asset.json";
import education from "@/assets/education.jpeg.asset.json";
import food from "@/assets/food-drive.jpeg.asset.json";
import space from "@/assets/space.jpeg.asset.json";
import { pageHead, site } from "@/lib/site";
import {
  fetchPublishedActivityPhotos,
  fetchPublishedStories,
  fetchPublicFundData,
  formatINR,
} from "@/lib/platform";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Connecting Education with Opportunity",
      "Rabata provides free learning, English communication and life skills for underprivileged children in Derabassi, Punjab.",
    ),
  component: Index,
});

function Index() {
  const photosQuery = useQuery({
    queryKey: ["home-activity-photos"],
    queryFn: fetchPublishedActivityPhotos,
  });
  const storiesQuery = useQuery({
    queryKey: ["home-success-stories"],
    queryFn: fetchPublishedStories,
  });
  const fundsQuery = useQuery({
    queryKey: ["home-funds-summary"],
    queryFn: fetchPublicFundData,
  });

  const uploadedPhotos = photosQuery.data ?? [];
  const topStory = storiesQuery.data?.[0];
  const fundSummary = fundsQuery.data?.summary;

  return (
    <>
      <section className="hero">
        <img
          className="hero-image"
          src={classroom.url}
          alt="Tammana Rathore teaching Rabata students together around a study table"
          width={1448}
          height={1086}
        />
        <div className="hero-shade" />
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="h-px w-7 bg-gold" /> Small beginnings. Lasting change.
            </div>
            <h1>
              Rabata.
              <br />
              Connecting education
              <br />
              with <em>opportunity.</em>
            </h1>
            <p className="hero-copy">
              Every child deserves the chance to learn, grow and build a better future. In
              Derabassi, Punjab, we pair free academic mentorship with life skills and complete
              transparency.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg" variant="secondary">
                <Link to="/student-registration">
                  <BookOpen /> Learn with Rabata <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="hero">
                <Link to="/volunteer">
                  <Heart /> Volunteer with us
                </Link>
              </Button>
            </div>
            <div className="hero-note">
              <ShieldCheck size={14} /> Free learning · Guardian-safe records · Open fund ledger ·{" "}
              <a href={`tel:${site.phone}`} className="underline">
                AI Helpline {site.phoneDisplay}
              </a>
            </div>
          </div>

          <aside className="hero-glass-card" aria-label="Rabata live transparency snapshot">
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              <ShieldCheck size={13} /> Transparent Grassroots Impact
            </div>
            <h2 style={{ fontSize: 22, color: "var(--primary-foreground)" }}>
              Accountable to every child &amp; supporter
            </h2>
            <p className="text-xs opacity-80 mt-2">
              Explore live verified fund allocations, subject-wise recorded classes, and
              safeguarding-protected student progress tracking.
            </p>
            <div className="hero-glass-grid">
              <div className="hero-glass-stat">
                <strong>10–15</strong>
                <span>Active Learners</span>
              </div>
              <div className="hero-glass-stat">
                <strong>100%</strong>
                <span>Free Mentorship</span>
              </div>
              <div className="hero-glass-stat">
                <strong>{formatINR(fundSummary?.totalReceivedInr ?? 0)}</strong>
                <span>Funds Recorded</span>
              </div>
              <div className="hero-glass-stat">
                <strong>{formatINR(fundSummary?.totalSpentInr ?? 0)}</strong>
                <span>Proof-Backed Spend</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="sm" variant="secondary">
                <Link to="/funds">Inspect Fund Ledger</Link>
              </Button>
              <Button asChild size="sm" variant="hero">
                <Link to="/students">Academic Profiles</Link>
              </Button>
            </div>
          </aside>
        </div>
        <span className="hero-caption">
          Rabata founder &amp; students learning together in Derabassi
        </span>
      </section>

      <section className="pillars">
        <div className="container pillars-inner">
          <div className="pillar">
            <div className="pillar-icon">
              <BookOpen />
            </div>
            <div>
              <h3>Educate</h3>
              <p>Strong foundations. Open minds.</p>
            </div>
          </div>
          <div className="pillar">
            <div className="pillar-icon">
              <Sprout />
            </div>
            <div>
              <h3>Empower</h3>
              <p>Skills, confidence and self-belief.</p>
            </div>
          </div>
          <div className="pillar">
            <div className="pillar-icon">
              <GraduationCap />
            </div>
            <div>
              <h3>Elevate</h3>
              <p>From learning to a better life.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container intro-grid">
          <div className="intro-text">
            <div className="eyebrow">
              <Leaf size={13} /> A connection that changes lives
            </div>
            <h2>
              A small initiative.
              <br />A belief without limits.
            </h2>
            <p>
              Founded by Tammana Rathore, Rabata is a community-led initiative in Derabassi, Punjab.
              We offer free educational support to children whose circumstances should never define
              their future.
            </p>
            <Link to="/about" className="text-link">
              Get to know Rabata <ArrowRight size={15} />
            </Link>
          </div>
          <div className="impact-mini">
            <div>
              <strong>10–15</strong>
              <span>children learning with us</span>
              <small>Organization profile figure</small>
            </div>
            <div>
              <strong>100%</strong>
              <span>free educational support</span>
            </div>
            <div>
              <strong>6</strong>
              <span>holistic skill dimensions</span>
            </div>
            <div>
              <strong>Open</strong>
              <span>bill-verified fund tracking</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <Camera size={13} /> Authentic work in action
              </div>
              <h2>Inside Rabata: teaching, mentorship &amp; community care</h2>
              <p className="section-copy">
                Moments from founder-led teaching sessions, mentor guidance, English learning
                circles and food drives in our community.
              </p>
            </div>
            <Link to="/admin" className="text-link">
              Upload real teaching &amp; mentor photos <ArrowRight size={15} />
            </Link>
          </div>

          <div className="gallery-grid">
            <article className="gallery-card">
              <img
                src={classroom.url}
                alt="Founder Tammana Rathore teaching Rabata students around a study table"
                loading="lazy"
                width={1448}
                height={1086}
              />
              <div className="gallery-card-body">
                <span className="pill-badge pill-green">Founder Teaching</span>
                <h3>Personal teaching with Tammana</h3>
                <p>
                  Direct, individual attention in foundational subjects, reading and confidence
                  building from the founder’s learning space.
                </p>
              </div>
            </article>

            <article className="gallery-card">
              <img
                src={education.url}
                alt="Rabata free English classes and mentorship poster"
                loading="lazy"
                width={904}
                height={1280}
              />
              <div className="gallery-card-body">
                <span className="pill-badge">Mentor Sessions</span>
                <h3>Spoken English &amp; academic support</h3>
                <p>
                  Reading, grammar, vocabulary and everyday communication practice led with patience
                  and dignity.
                </p>
              </div>
            </article>

            <article className="gallery-card">
              <img
                src={food.url}
                alt="Rabata food donation drive poster"
                loading="lazy"
                width={1024}
                height={1536}
              />
              <div className="gallery-card-body">
                <span className="pill-badge pill-gold">Community Activity</span>
                <h3>Fresh meals &amp; community care</h3>
                <p>
                  Freshly prepared home-cooked meals shared with children because nourishment and
                  learning belong together.
                </p>
              </div>
            </article>

            <article className="gallery-card">
              <img
                src={space.url}
                alt="Concept layout of Rabata community study space"
                loading="lazy"
                width={1312}
                height={1199}
              />
              <div className="gallery-card-body">
                <span className="pill-badge">Vision &amp; Study Space</span>
                <h3>A welcoming space to belong</h3>
                <p>
                  Our supplied vision for dedicated study corners, digital access and small-group
                  mentorship sessions.
                </p>
              </div>
            </article>

            {uploadedPhotos.map((photo) => (
              <article key={photo.id} className="gallery-card">
                <img src={photo.image_url} alt={photo.title} loading="lazy" />
                <div className="gallery-card-body">
                  <span className="pill-badge pill-green">{photo.category}</span>
                  <h3>{photo.title}</h3>
                  <p>{photo.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Learning is just the beginning</div>
              <h2>Building brighter futures, together.</h2>
              <p className="section-copy">
                The knowledge to learn. The confidence to grow. The skills to move forward.
              </p>
            </div>
            <Link to="/learn" className="text-link">
              Explore lectures &amp; resources <ArrowRight size={15} />
            </Link>
          </div>
          <div className="card-grid">
            <article className="program-card">
              <div className="card-icon">
                <BookOpen />
              </div>
              <h3>Education &amp; recorded lectures</h3>
              <p>
                Free academic support in English, Science and Mathematics alongside subject-wise
                recorded video lessons and publisher textbooks.
              </p>
              <Link to="/learn" className="text-link">
                Start learning <ArrowRight size={14} />
              </Link>
            </article>
            <article className="program-card">
              <div className="card-icon">
                <Users />
              </div>
              <h3>Personalised academic tracking</h3>
              <p>
                Every learner receives an individual academic profile tracking subject marks,
                attendance calendars, skills development and learning goals.
              </p>
              <Link to="/students" className="text-link">
                View academic tracking <ArrowRight size={14} />
              </Link>
            </article>
            <article className="program-card">
              <div className="card-icon">
                <GraduationCap />
              </div>
              <h3>A bridge to opportunity</h3>
              <p>
                Career awareness, interview preparation and practical guidance to connect classroom
                learning with the world beyond.
              </p>
              <Link to="/skills" className="text-link">
                Discover career support <ArrowRight size={14} />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-green">
        <div className="container community-grid">
          <div>
            <div className="eyebrow">
              <Award size={13} /> Success stories
            </div>
            <h2>Real journeys, honest milestones.</h2>
            {topStory ? (
              <>
                <p>
                  <strong>{topStory.title}:</strong> {topStory.story_summary}{" "}
                  {topStory.achievement_or_progress}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/impact" className="text-link">
                    Read all success stories <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            ) : (
              <p>
                Discover how individualized mentorship helps children grow academically and step
                into interviews and opportunities with self-belief.
              </p>
            )}
          </div>
          <div className="form-panel">
            <div className="eyebrow">
              <IndianRupee size={13} /> Fund transparency
            </div>
            <h3>Every rupee accounted for</h3>
            <p className="text-xs text-muted-foreground mt-2">
              Donors and supporters can inspect real fund receipts, planned allocations,
              expenditures and supporting bills on our dedicated transparency ledger.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <small className="block text-[11px] text-muted-foreground">Received</small>
                <strong className="text-xl font-semibold">
                  {formatINR(fundSummary?.totalReceivedInr ?? 0)}
                </strong>
              </div>
              <div>
                <small className="block text-[11px] text-muted-foreground">Utilised</small>
                <strong className="text-xl font-semibold">
                  {formatINR(fundSummary?.totalSpentInr ?? 0)}
                </strong>
              </div>
            </div>
            <Link to="/funds" className="text-link mt-5">
              Open Fund Transparency Ledger <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <h2>A little of your time. A lifetime of difference.</h2>
            <p>Teach, mentor, share resources or simply help us spread the word.</p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link to="/get-involved">
              Be a part of Rabata <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
