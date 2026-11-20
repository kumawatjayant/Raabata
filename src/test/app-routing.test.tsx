import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { site } from "@/lib/site";
import { resources } from "@/lib/resources";
import { calculateFundSummary, extractYouTubeId } from "@/lib/platform";
import {
  calculateAttendanceMetrics,
  calculateOverallAcademicProgress,
  calculateSubjectPercentage,
} from "@/lib/academic-profiles";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing & configuration", () => {
  it("uses Rabata's official email and never a personal inbox", () => {
    expect(site.email).toBe("rabataofficial111@gmail.com");
    expect(site.email).not.toContain("rathoretammana447");
  });

  it.each([
    "/",
    "/about",
    "/learn",
    "/students",
    "/impact",
    "/funds",
    "/community",
    "/skills",
    "/get-involved",
    "/contact",
    "/student-registration",
    "/volunteer",
    "/privacy",
    "/auth",
  ])("matches a page for %s instead of falling back to not found", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes(path);

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("attributes every external learning resource to a publisher", () => {
    expect(resources.length).toBeGreaterThan(8);
    for (const item of resources) {
      expect(item.publisher.trim().length).toBeGreaterThan(0);
      expect(item.url.startsWith("https://")).toBe(true);
    }
  });
});

describe("Platform helpers", () => {
  it("returns zero totals for an empty fund ledger", () => {
    const empty = calculateFundSummary([], []);
    expect(empty.totalReceivedInr).toBe(0);
    expect(empty.totalSpentInr).toBe(0);
    expect(empty.totalPlannedInr).toBe(0);
    expect(empty.availableBalanceInr).toBe(0);
  });

  it("computes received, spent, planned, available balance and category shares accurately", () => {
    const summary = calculateFundSummary(
      [
        {
          id: "d1",
          received_date: "2026-11-01",
          amount_inr: 5000,
          is_public_acknowledgement: true,
          public_label: "Well-wisher",
          purpose: "Books",
        },
        {
          id: "d2",
          received_date: "2026-11-02",
          amount_inr: 3000,
          is_public_acknowledgement: false,
          public_label: "Anonymous",
          purpose: "Food drive",
        },
      ],
      [
        {
          amount_inr: 2000,
          entry_type: "expenditure",
          category: "Learning Materials & Books",
          is_published: true,
        },
        {
          amount_inr: 2000,
          entry_type: "expenditure",
          category: "Community Food Drives",
          is_published: true,
        },
        {
          amount_inr: 1500,
          entry_type: "planned_allocation",
          category: "Digital & Computer Education",
          is_published: true,
        },
      ],
    );

    expect(summary.totalReceivedInr).toBe(8000);
    expect(summary.totalSpentInr).toBe(4000);
    expect(summary.totalPlannedInr).toBe(1500);
    expect(summary.availableBalanceInr).toBe(4000);
    expect(summary.acknowledgedDonations).toHaveLength(1);
    const books = summary.categoryBreakdown.find(
      (c) => c.category === "Learning Materials & Books",
    );
    expect(books?.sharePercent).toBe(50);
  });

  it("extracts YouTube video IDs from watch, short, and embed URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=O-6q-siuMik")).toBe("O-6q-siuMik");
    expect(extractYouTubeId("https://youtu.be/O-6q-siuMik")).toBe("O-6q-siuMik");
    expect(extractYouTubeId("O-6q-siuMik")).toBe("O-6q-siuMik");
    expect(extractYouTubeId("https://example.com/lecture.mp4")).toBeNull();
  });

  it("computes academic percentages, progress tiers and attendance metrics", () => {
    expect(calculateSubjectPercentage(42, 50)).toBe(84);
    expect(calculateSubjectPercentage(0, 0)).toBe(0);

    const overall = calculateOverallAcademicProgress([
      {
        id: "1",
        subject: "English",
        totalMarks: 100,
        marksObtained: 86,
        percentage: 86,
        previousMarks: 70,
        currentMarks: 86,
        teacherRemarks: "",
      },
      {
        id: "2",
        subject: "Mathematics",
        totalMarks: 100,
        marksObtained: 74,
        percentage: 74,
        previousMarks: 60,
        currentMarks: 74,
        teacherRemarks: "",
      },
    ]);
    expect(overall.percentage).toBe(80);
    expect(overall.tier).toBe("Excellent");
    expect(overall.strongestSubject).toBe("English");
    expect(overall.needsAttentionSubject).toBe("Mathematics");

    const att = calculateAttendanceMetrics({
      "2026-11-01": "present",
      "2026-11-02": "present",
      "2026-11-03": "present",
      "2026-11-04": "absent",
    });
    expect(att.totalConducted).toBe(4);
    expect(att.attended).toBe(3);
    expect(att.missed).toBe(1);
    expect(att.percentage).toBe(75);
  });
});
