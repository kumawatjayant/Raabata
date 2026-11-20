import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  Download,
  ExternalLink,
  FileCheck2,
  HeartHandshake,
  IndianRupee,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/site-shell";
import { pageHead } from "@/lib/site";
import {
  fetchPublicFundData,
  formatINR,
  FUND_CATEGORIES,
  type AcknowledgedDonation,
  type FundAllocationRow,
} from "@/lib/platform";

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadFundsAuditCsv(
  allocations: FundAllocationRow[],
  acknowledgedDonations: AcknowledgedDonation[],
): void {
  if (typeof window === "undefined") return;
  const headers = [
    "Record ID",
    "Date",
    "Entry Kind",
    "Category / Purpose",
    "Title",
    "Vendor / Public Donor Label",
    "Amount (INR)",
    "Proof Type",
    "Proof URL",
    "Description",
  ];

  const rows: string[][] = [
    ...allocations.map((a) => [
      a.id,
      a.entry_date,
      a.entry_type === "expenditure" ? "Expenditure (Spent)" : "Planned Allocation",
      a.category,
      a.title,
      a.vendor_or_beneficiary ?? "",
      String(a.amount_inr),
      a.proof_type ?? "",
      a.proof_url ?? "",
      a.description ?? "",
    ]),
    ...acknowledgedDonations.map((d) => [
      d.id,
      d.received_date,
      "Publicly Acknowledged Contribution",
      d.purpose,
      d.public_label,
      d.public_label,
      String(d.amount_inr),
      "",
      "",
      d.purpose,
    ]),
  ];

  const csvContent = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "rabata-fund-transparency-ledger.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const Route = createFileRoute("/funds")({
  head: () =>
    pageHead(
      "Fund Transparency & Allocation",
      "See how funds received by Rabata are allocated, spent and verified with supporting bills, receipts and photographs.",
    ),
  component: FundsPage,
});

function FundsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>("All categories");
  const [typeFilter, setTypeFilter] = useState<"all" | "expenditure" | "planned_allocation">("all");
  const [activeProof, setActiveProof] = useState<FundAllocationRow | null>(null);

  const q = useQuery({
    queryKey: ["public-funds"],
    queryFn: fetchPublicFundData,
  });

  const allocations = q.data?.allocations ?? [];
  const summary = q.data?.summary ?? {
    totalReceivedInr: 0,
    totalSpentInr: 0,
    totalPlannedInr: 0,
    availableBalanceInr: 0,
    donationCount: 0,
    expenditureCount: 0,
    acknowledgedDonations: [],
    categoryBreakdown: FUND_CATEGORIES.map((category) => ({
      category,
      plannedInr: 0,
      spentInr: 0,
      sharePercent: 0,
    })),
  };

  const filteredAllocations = allocations.filter(
    (entry) =>
      (categoryFilter === "All categories" || entry.category === categoryFilter) &&
      (typeFilter === "all" || entry.entry_type === typeFilter),
  );

  const isImageUrl = (url: string) =>
    /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url) || url.startsWith("data:image/");

  return (
    <>
      <PageHeading
        eyebrow="Open ledger · Donor trust"
        title="Fund transparency & allocation"
        description="Every contribution entrusted to Rabata is tracked openly. View real received totals, planned allocations, verified expenditures, and supporting bills or receipts."
      />

      <section className="section">
        <div className="container">
          <div className="trust-banner mb-8">
            <ShieldCheck size={18} />
            <div>
              <strong>Real-record guarantee:</strong> All totals below are calculated directly from
              verified entries in Rabata’s database. Personal donor contact and banking details are
              strictly private and never exposed publicly.
            </div>
          </div>

          <div className="stat-cards">
            <article className="stat-card">
              <div className="stat-label">
                <IndianRupee size={15} /> Total funds received
              </div>
              <div className="stat-value">{formatINR(summary.totalReceivedInr)}</div>
              <small className="stat-note">
                From {summary.donationCount} recorded{" "}
                {summary.donationCount === 1 ? "contribution" : "contributions"}
              </small>
            </article>

            <article className="stat-card">
              <div className="stat-label">
                <Receipt size={15} /> Total spent / utilised
              </div>
              <div className="stat-value">{formatINR(summary.totalSpentInr)}</div>
              <small className="stat-note">
                Across {summary.expenditureCount} verified{" "}
                {summary.expenditureCount === 1 ? "expense" : "expenses"}
              </small>
            </article>

            <article className="stat-card">
              <div className="stat-label">
                <HeartHandshake size={15} /> Available balance
              </div>
              <div className="stat-value">{formatINR(summary.availableBalanceInr)}</div>
              <small className="stat-note">
                Remaining for upcoming student &amp; community needs
              </small>
            </article>

            <article className="stat-card">
              <div className="stat-label">
                <FileCheck2 size={15} /> Planned allocations
              </div>
              <div className="stat-value">{formatINR(summary.totalPlannedInr)}</div>
              <small className="stat-note">Earmarked across learning &amp; meal programmes</small>
            </article>
          </div>

          <div className="section-head mt-14">
            <div>
              <div className="eyebrow">Where funds go</div>
              <h2>Distribution by programme area</h2>
              <p className="section-copy">
                How contributions are allocated across books, digital literacy, food drives, study
                space needs, and career mentorship workshops.
              </p>
            </div>
            <Link to="/admin" className="text-link">
              Admin: Manage ledger &amp; upload proofs <ArrowRight size={15} />
            </Link>
          </div>

          <div className="card-grid">
            {summary.categoryBreakdown.map((item) => (
              <article key={item.category} className="program-card">
                <h3>{item.category}</h3>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Spent / Utilised</span>
                    <strong className="text-foreground">{formatINR(item.spentInr)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned Allocation</span>
                    <strong className="text-foreground">{formatINR(item.plannedInr)}</strong>
                  </div>
                </div>
                <div className="fund-bar mt-4" aria-label={`${item.sharePercent}% of total spent`}>
                  <div className="fund-bar-fill" style={{ width: `${item.sharePercent}%` }} />
                </div>
                <small className="mt-2 text-[11px] text-muted-foreground">
                  {item.sharePercent}% of total recorded expenditure
                </small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Bills, receipts &amp; proofs</div>
              <h2>Allocation &amp; expenditure ledger</h2>
              <p className="section-copy">
                Inspect every published expenditure and planned allocation along with uploaded
                supporting documents, bills, and photographs.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={allocations.length === 0 && summary.acknowledgedDonations.length === 0}
              onClick={() => downloadFundsAuditCsv(allocations, summary.acknowledgedDonations)}
            >
              <Download size={14} /> Download Open Audit CSV
            </Button>
          </div>

          <div className="filters" style={{ gridTemplateColumns: "2fr 1fr" }}>
            <select
              aria-label="Filter by programme category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option>All categories</option>
              {FUND_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by entry type"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "all" | "expenditure" | "planned_allocation")
              }
            >
              <option value="all">All entries (Spent &amp; Planned)</option>
              <option value="expenditure">Spent / Utilised only</option>
              <option value="planned_allocation">Planned allocations only</option>
            </select>
          </div>

          {q.isLoading ? (
            <div className="empty-state">Loading verified fund records…</div>
          ) : filteredAllocations.length === 0 ? (
            <div className="empty-state">
              <p className="font-medium text-foreground">
                No verified fund allocations or expenditures have been published yet.
              </p>
              <p className="mt-2 text-xs">
                Rabata displays ₹0 until real, receipt-backed entries are recorded by the
                administrator.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAllocations.map((entry) => (
                <article key={entry.id} className="ledger-row">
                  <div className="ledger-main">
                    <div className="ledger-badges">
                      <span
                        className={`pill-badge ${
                          entry.entry_type === "expenditure" ? "pill-green" : "pill-gold"
                        }`}
                      >
                        {entry.entry_type === "expenditure"
                          ? "Spent / Utilised"
                          : "Planned Allocation"}
                      </span>
                      <span className="pill-badge">{entry.category}</span>
                      <span className="text-xs text-muted-foreground">{entry.entry_date}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-medium">{entry.title}</h3>
                    {entry.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{entry.description}</p>
                    )}
                    {entry.vendor_or_beneficiary && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <strong>Vendor / Purpose:</strong> {entry.vendor_or_beneficiary}
                      </p>
                    )}
                  </div>
                  <div className="ledger-side">
                    <div className="ledger-amount">{formatINR(Number(entry.amount_inr))}</div>
                    {entry.proof_url ? (
                      <Button variant="outline" size="sm" onClick={() => setActiveProof(entry)}>
                        <Receipt size={14} /> View {entry.proof_type ?? "proof"}
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        No proof file attached
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeProof && activeProof.proof_url && (
            <div className="form-panel mt-8" role="region" aria-label="Supporting proof viewer">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Supporting {activeProof.proof_type ?? "document"}</div>
                  <h3>{activeProof.title}</h3>
                  {activeProof.proof_caption && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeProof.proof_caption}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={activeProof.proof_url} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} /> Open original file
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setActiveProof(null)}>
                    Close
                  </Button>
                </div>
              </div>
              {isImageUrl(activeProof.proof_url) ? (
                <img
                  src={activeProof.proof_url}
                  alt={activeProof.proof_caption || activeProof.title}
                  className="mt-4 max-h-[520px] w-full rounded-md object-contain bg-muted"
                />
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">
                  This supporting proof is an external document or PDF. Use “Open original file” to
                  inspect it.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Community support</div>
              <h2>Publicly acknowledged contributions</h2>
              <p className="section-copy">
                Contributions where the supporter consented to public acknowledgement. Private donor
                names, emails and phone numbers are never shown.
              </p>
            </div>
          </div>

          {summary.acknowledgedDonations.length === 0 ? (
            <div className="empty-state">
              No publicly acknowledged contributions recorded yet. Interested in supporting books,
              meals or classes?{" "}
              <Link to="/contact" className="text-link">
                Connect with Rabata <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {summary.acknowledgedDonations.map((d) => (
                <div key={d.id} className="ledger-row">
                  <div>
                    <strong>{d.public_label}</strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      {d.purpose} · {d.received_date}
                    </p>
                  </div>
                  <div className="ledger-amount">{formatINR(d.amount_inr)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
