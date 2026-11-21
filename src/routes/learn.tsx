import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Download,
  HelpCircle,
  MessageCircle,
  Play,
  RotateCcw,
  Search,
  Video,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnglishSpeakingTutor } from "@/components/english-speaking-tutor";
import { PageHeading } from "@/components/site-shell";
import { pageHead } from "@/lib/site";
import { resources, type LearningResource } from "@/lib/resources";
import {
  CLASS_LEVELS,
  fetchPublishedLectures,
  getQuizForLecture,
  LECTURE_SUBJECTS,
  type RecordedLectureRow,
} from "@/lib/platform";

export const Route = createFileRoute("/learn")({
  head: () =>
    pageHead(
      "Learn with Rabata",
      "Watch Rabata recorded lectures organized by subject and topic, and explore free English, Science, Math, digital literacy and career resources.",
    ),
  component: Learn,
});

function Learn() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [type, setType] = useState("All types");
  const [level, setLevel] = useState("All classes");
  const [selectedResource, setSelectedResource] = useState<LearningResource | null>(null);

  const [lectureSubject, setLectureSubject] = useState("All subjects");
  const [lectureClass, setLectureClass] = useState("All classes");
  const [lectureTopic, setLectureTopic] = useState("All topics");
  const [lectureSearch, setLectureSearch] = useState("");
  const [activeLecture, setActiveLecture] = useState<RecordedLectureRow | null>(null);
  const [quizLecture, setQuizLecture] = useState<RecordedLectureRow | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  function openQuiz(lecture: RecordedLectureRow) {
    setQuizLecture(lecture);
    setQuizAnswers({});
  }

  const activeQuizQuestions = useMemo(
    () => (quizLecture ? getQuizForLecture(quizLecture) : []),
    [quizLecture],
  );
  const quizAnsweredCount = activeQuizQuestions.filter(
    (q) => typeof quizAnswers[q.id] === "number",
  ).length;
  const quizCorrectCount = activeQuizQuestions.filter(
    (q) => quizAnswers[q.id] === q.correctIndex,
  ).length;

  const lecturesQuery = useQuery({
    queryKey: ["recorded-lectures"],
    queryFn: fetchPublishedLectures,
  });

  const lectures = useMemo(() => lecturesQuery.data ?? [], [lecturesQuery.data]);

  const availableTopics = useMemo(() => {
    const topics = new Set<string>();
    for (const item of lectures) {
      if (lectureSubject === "All subjects" || item.subject === lectureSubject) {
        if (item.topic.trim()) topics.add(item.topic.trim());
      }
    }
    return ["All topics", ...Array.from(topics)];
  }, [lectures, lectureSubject]);

  const filteredLectures = lectures.filter((l) => {
    const matchesSearch = (l.title + " " + l.description + " " + l.topic + " " + l.instructor_name)
      .toLowerCase()
      .includes(lectureSearch.toLowerCase());
    const matchesSubject = lectureSubject === "All subjects" || l.subject === lectureSubject;
    const matchesClass =
      lectureClass === "All classes" || l.class_level === "All" || l.class_level === lectureClass;
    const matchesTopic = lectureTopic === "All topics" || l.topic === lectureTopic;
    return matchesSearch && matchesSubject && matchesClass && matchesTopic;
  });

  const filteredResources = resources.filter(
    (r) =>
      (r.title + " " + r.description + " " + r.publisher)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (subject === "All subjects" || r.subject === subject) &&
      (type === "All types" || r.type === type) &&
      (level === "All classes" || r.level === "All" || r.level === level),
  );

  return (
    <>
      <PageHeading
        eyebrow="A world of learning. Free for everyone."
        title="Learn with Rabata"
        description="Practice speaking English with a friendly partner, watch recorded mentor lessons, and explore curated resources from trusted publishers."
      />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <MessageCircle size={13} /> Spoken English practice
              </div>
              <h2>Practice speaking English</h2>
              <p className="section-copy">
                Talk freely on any topic like chatting with a friend — get natural replies back and
                gentle corrections whenever phrasing can be smoother.
              </p>
            </div>
          </div>
          <EnglishSpeakingTutor />
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <Video size={13} /> Recorded lectures
              </div>
              <h2>Rabata recorded lessons</h2>
              <p className="section-copy">
                Video lectures uploaded by Rabata teachers, organized subject-wise and topic-wise so
                students can revise anytime at their own pace.
              </p>
            </div>
            <Link to="/admin" className="text-link">
              Admin: Upload or manage lectures <ArrowRight size={15} />
            </Link>
          </div>

          <div className="filters">
            <div className="search-field">
              <Search size={16} />
              <input
                aria-label="Search recorded lectures"
                value={lectureSearch}
                onChange={(e) => setLectureSearch(e.target.value)}
                placeholder="Search lectures by title or topic…"
              />
            </div>
            <select
              aria-label="Filter lectures by subject"
              value={lectureSubject}
              onChange={(e) => {
                setLectureSubject(e.target.value);
                setLectureTopic("All topics");
              }}
            >
              <option>All subjects</option>
              {LECTURE_SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Filter lectures by topic"
              value={lectureTopic}
              onChange={(e) => setLectureTopic(e.target.value)}
            >
              {availableTopics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              aria-label="Filter lectures by class"
              value={lectureClass}
              onChange={(e) => setLectureClass(e.target.value)}
            >
              <option>All classes</option>
              {CLASS_LEVELS.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>

          {activeLecture && (
            <div className="form-panel mb-8" role="region" aria-label="Recorded lecture player">
              <div className="section-head mb-2">
                <div>
                  <div className="eyebrow">
                    {activeLecture.subject} · {activeLecture.topic}
                  </div>
                  <h2>{activeLecture.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Instructor: {activeLecture.instructor_name}
                    {activeLecture.duration ? ` · ${activeLecture.duration}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => openQuiz(activeLecture)}>
                    <HelpCircle size={15} /> Practice Quiz (3 Qs)
                  </Button>
                  <Button variant="ghost" onClick={() => setActiveLecture(null)}>
                    Close player
                  </Button>
                </div>
              </div>
              {activeLecture.youtube_id ? (
                <iframe
                  className="video-frame"
                  src={`https://www.youtube-nocookie.com/embed/${activeLecture.youtube_id}`}
                  title={`${activeLecture.title} — ${activeLecture.instructor_name}`}
                  allow="accelerometer; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  className="video-frame bg-black"
                  src={activeLecture.video_url}
                  controls
                  playsInline
                >
                  Your browser does not support video playback.
                </video>
              )}
              {activeLecture.description && (
                <p className="mt-4 text-sm text-muted-foreground">{activeLecture.description}</p>
              )}
            </div>
          )}

          {quizLecture && (
            <div className="quiz-panel mb-8" role="region" aria-label="Interactive practice quiz">
              <div className="section-head mb-4">
                <div>
                  <div className="eyebrow">
                    <HelpCircle size={13} /> Self-check practice quiz
                  </div>
                  <h3>{quizLecture.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select an option for each question to receive instant feedback and explanation.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pill-badge pill-green">
                    Score: {quizCorrectCount}/{activeQuizQuestions.length}
                    {quizAnsweredCount === activeQuizQuestions.length &&
                      quizCorrectCount === activeQuizQuestions.length &&
                      " · Mastered!"}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setQuizAnswers({})}>
                    <RotateCcw size={13} /> Reset
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setQuizLecture(null)}>
                    Close quiz
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {activeQuizQuestions.map((qq, idx) => {
                  const chosen = quizAnswers[qq.id];
                  const isAnswered = typeof chosen === "number";
                  const isCorrect = isAnswered && chosen === qq.correctIndex;
                  return (
                    <div key={qq.id} className="quiz-question">
                      <div className="font-semibold text-sm text-foreground mb-3">
                        Q{idx + 1}. {qq.question}
                      </div>
                      <div className="grid gap-2">
                        {qq.options.map((opt, optIdx) => {
                          const isSelected = chosen === optIdx;
                          const optionClass = isAnswered
                            ? optIdx === qq.correctIndex
                              ? "is-correct"
                              : isSelected
                                ? "is-wrong"
                                : ""
                            : "";
                          return (
                            <button
                              key={opt}
                              type="button"
                              className={`quiz-option ${optionClass}`}
                              onClick={() =>
                                setQuizAnswers((prev) => ({ ...prev, [qq.id]: optIdx }))
                              }
                            >
                              <span>{opt}</span>
                              {isAnswered && optIdx === qq.correctIndex && (
                                <CheckCircle2 size={15} />
                              )}
                              {isAnswered && isSelected && optIdx !== qq.correctIndex && (
                                <XCircle size={15} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {isAnswered && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          <strong className={isCorrect ? "text-foreground" : "text-destructive"}>
                            {isCorrect ? "Well done! " : "Review tip: "}
                          </strong>
                          {qq.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {lecturesQuery.isLoading ? (
            <div className="empty-state">Loading recorded lectures…</div>
          ) : filteredLectures.length === 0 ? (
            <div className="empty-state">
              <p className="font-medium text-foreground">
                No recorded lectures match your filter yet.
              </p>
              <p className="mt-2 text-xs">
                As Tammana and approved teachers upload recorded classes in the Administrator
                dashboard, they appear here organized by subject and topic. Explore the free curated
                publisher lessons below in the meantime.
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {filteredLectures.map((lecture) => (
                <article key={lecture.id} className="resource-card">
                  <div className="resource-visual">
                    {lecture.thumbnail_url ? (
                      <img
                        src={lecture.thumbnail_url}
                        alt={lecture.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Play />
                    )}
                    <span className="resource-type">
                      {lecture.topic}
                      {lecture.duration ? ` · ${lecture.duration}` : ""}
                    </span>
                  </div>
                  <div className="resource-body">
                    <div className="resource-meta">
                      {lecture.subject} ·{" "}
                      {lecture.class_level === "All"
                        ? "All learners"
                        : `Class ${lecture.class_level}`}{" "}
                      · {lecture.instructor_name}
                    </div>
                    <h3>{lecture.title}</h3>
                    <p>{lecture.description || "Recorded lesson from Rabata."}</p>
                    <div className="mt-auto flex flex-wrap gap-2">
                      <Button variant="default" onClick={() => setActiveLecture(lecture)}>
                        <Play /> Watch lecture
                      </Button>
                      <Button variant="outline" onClick={() => openQuiz(lecture)}>
                        <HelpCircle size={15} /> Practice Quiz
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Trusted open educational resources</div>
              <h2>Curated publisher library</h2>
              <p className="section-copy">
                Free textbooks, grammar practice, digital literacy guides and career resources
                linked directly from NCERT, NIELIT, Khan Academy, GCFGlobal and the British Council.
              </p>
            </div>
          </div>

          <div className="filters">
            <div className="search-field">
              <Search size={16} />
              <input
                aria-label="Search learning resources"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="What would you like to learn?"
              />
            </div>
            <select
              aria-label="Filter by subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {[
                "All subjects",
                "English",
                "Mathematics",
                "Science",
                "Digital literacy",
                "Career readiness",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Filter by class"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option>All classes</option>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by resource type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {["All types", "PDF", "Video", "Guide", "Activities", "Worksheets", "Quiz"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </div>

          <p className="mb-5 text-xs text-muted-foreground">
            {filteredResources.length} resources · External resources are provided by their
            respective publishers.
          </p>

          <div className="card-grid">
            {filteredResources.map((r) => (
              <article key={r.id} className="resource-card bg-background">
                <div className="resource-visual">
                  {r.type === "Video" ? <Play /> : <BookOpen />}
                  <span className="resource-type">{r.type}</span>
                </div>
                <div className="resource-body">
                  <div className="resource-meta">
                    {r.subject} · {r.level === "All" ? "All learners" : `Class ${r.level}`} ·{" "}
                    {r.publisher}
                  </div>
                  <h3>{r.title}</h3>
                  <p>{r.description}</p>
                  {r.video ? (
                    <Button variant="outline" onClick={() => setSelectedResource(r)}>
                      <Play /> Watch lesson
                    </Button>
                  ) : (
                    <Button asChild variant="outline">
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.type === "PDF" ? <Download /> : <ArrowUpRight />}
                        {r.type === "PDF" ? "Open PDF" : "Explore resource"}
                      </a>
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {!filteredResources.length && (
            <div className="empty-state">
              No matching resources. Try a different search or filter.
            </div>
          )}

          {selectedResource?.video && (
            <div className="mt-10">
              <div className="section-head">
                <div>
                  <div className="eyebrow">{selectedResource.publisher}</div>
                  <h2>{selectedResource.title}</h2>
                </div>
                <Button variant="ghost" onClick={() => setSelectedResource(null)}>
                  Close lesson
                </Button>
              </div>
              <iframe
                className="video-frame"
                src={`https://www.youtube-nocookie.com/embed/${selectedResource.video}`}
                title={`${selectedResource.publisher} — ${selectedResource.title}`}
                allow="accelerometer; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
