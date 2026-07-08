"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="wrap">
      <header style={{ marginBottom: 32 }}>
        <div className="eyebrow">Support tools</div>
        <h1 style={{ fontWeight: 800, fontSize: 34, letterSpacing: "-0.02em", marginBottom: 8 }}>
          POS ↔ Reelo Reconciliation
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 560, lineHeight: 1.55 }}>
          Pick a tool below. Everything here works on files you upload — nothing is stored on our
          servers once you leave the page.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <Link href="/reconcile" style={{ textDecoration: "none" }}>
          <div className="choice-card" style={{ height: "100%" }}>
            <div className="title">Bill Reconciliation</div>
            <div className="desc">
              Upload the POS order-master export and the Reelo export, map the columns, and get a
              clean mismatch report — missing bills, amount mismatches, duplicates.
            </div>
            <div style={{ marginTop: 14 }}>
              <span className="tag tag-forest">Manual upload · Live</span>
            </div>
          </div>
        </Link>

        <Link href="/lookup" style={{ textDecoration: "none" }}>
          <div className="choice-card" style={{ height: "100%" }}>
            <div className="title">Customer Lookup</div>
            <div className="desc">
              Enter a restID and a customer's mobile number to pull their full bill history
              straight from Petpooja — single date, range, or all-time.
            </div>
            <div style={{ marginTop: 14 }}>
              <span className="tag tag-forest">Live</span>
            </div>
          </div>
        </Link>

        <div className="choice-card" style={{ height: "100%", cursor: "default", opacity: 0.7 }}>
          <div className="title">Automated Reconciliation</div>
          <div className="desc">
            Pull POS and Reelo data automatically by restID and date range, no manual file
            uploads. Includes scheduled runs and a ticket-status tracker.
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <span className="locked-badge">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" />
              </svg>
              Coming soon
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <LogoutButton />
      </div>
    </div>
  );
}

function LogoutButton() {
  return (
    <a
      href="/login"
      onClick={async (e) => {
        e.preventDefault();
        await fetch("/api/auth", { method: "DELETE" });
        window.location.href = "/login";
      }}
      style={{ fontSize: 13, color: "var(--muted)", textDecoration: "underline", cursor: "pointer" }}
    >
      Sign out
    </a>
  );
}
