import { useState } from "react";
import { Calendar, TrendingUp } from "lucide-react";
import type {
  AttendanceDayStatus,
  MonthlyAssessmentItem,
  SubjectPerformanceItem,
} from "@/lib/academic-profiles";

export function MonthlyPerformanceSvgChart({
  assessments,
}: {
  assessments: MonthlyAssessmentItem[];
}) {
  if (assessments.length === 0) {
    return (
      <div className="empty-state">
        No monthly assessments recorded yet. Add a monthly assessment below to visualize progress
        over time.
      </div>
    );
  }

  const width = 620;
  const height = 220;
  const padX = 48;
  const padY = 26;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const points = assessments.map((m, idx) => {
    const x =
      assessments.length === 1 ? padX + plotW / 2 : padX + (idx / (assessments.length - 1)) * plotW;
    const y = padY + plotH - (Math.min(100, Math.max(0, m.overallPercentage)) / 100) * plotH;
    return { x, y, item: m };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="chart-box">
      <div className="chart-title">
        <TrendingUp size={15} /> Monthly Academic Performance Over Time
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Monthly academic performance line chart"
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padY + plotH - (tick / 100) * plotH;
          return (
            <g key={tick}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.12}
              />
              <text
                x={padX - 10}
                y={y + 4}
                fontSize="10"
                textAnchor="end"
                fill="currentColor"
                opacity={0.6}
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {points.length > 1 && (
          <polyline
            fill="none"
            stroke="var(--leaf)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />
        )}

        {points.map(({ x, y, item }) => (
          <g key={item.id}>
            <circle
              cx={x}
              cy={y}
              r="6"
              fill="var(--gold)"
              stroke="var(--primary)"
              strokeWidth="2"
            />
            <text
              x={x}
              y={y - 11}
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
              fill="var(--primary)"
            >
              {item.overallPercentage}%
            </text>
            <text
              x={x}
              y={height - 6}
              fontSize="10"
              textAnchor="middle"
              fill="currentColor"
              opacity={0.75}
            >
              {item.month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function SubjectStrengthsChart({ subjects }: { subjects: SubjectPerformanceItem[] }) {
  if (subjects.length === 0) {
    return (
      <div className="empty-state">
        Add subjects in Section B to compare subject-wise strengths and areas needing attention.
      </div>
    );
  }

  return (
    <div className="chart-box">
      <div className="chart-title">Subject-wise Strengths &amp; Areas to Strengthen</div>
      <div className="space-y-3 mt-3">
        {subjects.map((sub) => {
          const prevPct =
            sub.totalMarks > 0 ? Math.round((sub.previousMarks / sub.totalMarks) * 100) : 0;
          const diff = sub.percentage - prevPct;
          const tone =
            sub.percentage >= 80
              ? "var(--leaf)"
              : sub.percentage >= 65
                ? "var(--primary)"
                : "var(--gold)";
          return (
            <div key={sub.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <strong>{sub.subject}</strong>
                <span>
                  <strong>{sub.percentage}%</strong>{" "}
                  <small className="text-muted-foreground">
                    ({diff >= 0 ? `+${diff}%` : `${diff}%`} vs previous)
                  </small>
                </span>
              </div>
              <div className="fund-bar">
                <div
                  className="fund-bar-fill"
                  style={{ width: `${sub.percentage}%`, background: tone }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CoreCompetencyChart({ assessments }: { assessments: MonthlyAssessmentItem[] }) {
  const latest = assessments[assessments.length - 1];
  if (!latest) {
    return (
      <div className="empty-state">
        Record a monthly assessment to see Reading, Writing, Communication &amp; Problem-Solving
        metrics.
      </div>
    );
  }

  const metrics = [
    { label: "Reading", value: latest.readingScore },
    { label: "Writing", value: latest.writingScore },
    { label: "Communication", value: latest.communicationScore },
    { label: "Problem-Solving", value: latest.problemSolvingScore },
  ];

  return (
    <div className="chart-box">
      <div className="chart-title">Core Learning Dimensions ({latest.month})</div>
      <div className="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="competency-pill">
            <div className="text-xs text-muted-foreground">{m.label}</div>
            <div className="text-2xl font-semibold mt-1">{m.value}%</div>
            <div className="fund-bar mt-2">
              <div className="fund-bar-fill" style={{ width: `${m.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthlyAttendanceCalendar({
  calendar,
  canEdit,
  onMarkDate,
}: {
  calendar: Record<string, AttendanceDayStatus>;
  canEdit: boolean;
  onMarkDate: (dateStr: string, status: AttendanceDayStatus) => void;
}) {
  const [month, setMonth] = useState("2026-11");
  const [selectedStatus, setSelectedStatus] = useState<AttendanceDayStatus>("present");

  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr) || 2026;
  const mon = (Number(monthStr) || 11) - 1;
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  return (
    <div className="chart-box">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="chart-title">
          <Calendar size={15} /> Monthly Attendance Calendar
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Select attendance month"
            type="month"
            className="border rounded px-2 py-1 text-xs bg-background"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          {canEdit && (
            <select
              aria-label="Attendance status to mark"
              className="border rounded px-2 py-1 text-xs bg-background"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as AttendanceDayStatus)}
            >
              <option value="present">Click day to mark: Present</option>
              <option value="absent">Click day to mark: Absent</option>
              <option value="excused">Click day to mark: Excused</option>
            </select>
          )}
        </div>
      </div>

      <div className="calendar-grid">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const st = calendar[dateStr];
          return (
            <button
              key={dateStr}
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && onMarkDate(dateStr, selectedStatus)}
              className={`cal-day ${st ? `cal-${st}` : ""}`}
              title={
                st
                  ? `${dateStr}: ${st}`
                  : canEdit
                    ? `Click to mark ${dateStr} as ${selectedStatus}`
                    : dateStr
              }
            >
              <span>{day}</span>
              <small>{st ? st[0]?.toUpperCase() : "·"}</small>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="cal-dot cal-present" /> Present (P)
        </span>
        <span className="flex items-center gap-1">
          <span className="cal-dot cal-absent" /> Absent (A)
        </span>
        <span className="flex items-center gap-1">
          <span className="cal-dot cal-excused" /> Excused (E)
        </span>
      </div>
    </div>
  );
}
