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

      <div style={{ maxWidth: 420 }}>
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
