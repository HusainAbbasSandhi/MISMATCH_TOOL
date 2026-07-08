"use client";

import { useState } from "react";
import Link from "next/link";

interface Bill {
  billNumber: string;
  orderTime: string;
  type: string;
  paymentType: string;
  mobile: string;
  customerName: string;
  items: { name: string; quantity: number; rate: number; subtotal: number }[];
  discount: number;
  taxTotal: number;
  subtotal: number;
  amount: number;
}

function fmtMoney(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function LookupPage() {
  const [restId, setRestId] = useState("");
  const [mobile, setMobile] = useState("");
  const [mode, setMode] = useState<"single" | "range" | "all">("single");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [live, setLive] = useState(true);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  async function handleSearch() {
    setError("");
    setLoading(true);
    setBills(null);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restId, mobile, mode, date, from, to }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setBills(data.bills);
        setLive(data.live);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!bills) return;
    const header = ["Bill Number", "Date", "Time", "Type", "Payment", "Items", "Subtotal", "Discount", "Tax", "Total"];
    const rows = bills.map((b) => [
      b.billNumber,
      b.orderTime.slice(0, 10),
      fmtTime(b.orderTime),
      b.type,
      b.paymentType,
      b.items.map((it) => `${it.name} x${it.quantity}`).join("; "),
      b.subtotal,
      b.discount,
      b.taxTotal,
      b.amount,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mobile}_order_history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const total = bills ? bills.reduce((s, b) => s + b.amount, 0) : 0;
  const billCounts = bills
    ? Object.values(
        bills.reduce((acc: Record<string, number>, b) => {
          acc[b.billNumber] = (acc[b.billNumber] || 0) + 1;
          return acc;
        }, {})
      )
    : [];
  const repeatedCount = billCounts.filter((c) => c > 1).length;

  return (
    <div className="wrap">
      <div style={{ marginBottom: 8 }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "underline" }}>
          ← Back to tools
        </Link>
      </div>
      <header style={{ marginBottom: 24 }}>
        <div className="eyebrow">Customer Lookup</div>
        <h1 style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Order history, by phone number
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 600, lineHeight: 1.55 }}>
          Scoped to one restaurant at a time — enter the restID for the ticket you're working on.
        </p>
        {!live && (
          <div
            style={{
              marginTop: 14,
              display: "inline-flex",
              gap: 8,
              background: "var(--gold-soft)",
              color: "#8a5c17",
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 14px",
              borderRadius: 10,
            }}
          >
            Running in sample-data mode — the live Petpooja endpoint hasn't been confirmed/enabled yet. Try restID{" "}
            <strong>any</strong> and mobile <strong>9876543210</strong>.
          </div>
        )}
      </header>

      <div className="panel">
        <div className="panel-label">Search</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div className="field">
            <label>restID</label>
            <input type="text" value={restId} onChange={(e) => setRestId(e.target.value)} placeholder="e.g. 12345" />
          </div>
          <div className="field">
            <label>Mobile number</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9876543210"
              maxLength={10}
            />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Date mode</label>
          <div style={{ display: "flex", gap: 8, background: "#f4ede1", padding: 4, borderRadius: 11, width: "fit-content" }}>
            {(["single", "range", "all"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="btn"
                style={{
                  background: mode === m ? "var(--forest)" : "transparent",
                  color: mode === m ? "#fff" : "var(--muted)",
                  padding: "8px 14px",
                  fontSize: 13,
                }}
              >
                {m === "single" ? "Single date" : m === "range" ? "Date range" : "All time"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          {mode === "single" && (
            <div className="field" style={{ width: 200 }}>
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          {mode === "range" && (
            <>
              <div className="field" style={{ width: 180 }}>
                <label>From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="field" style={{ width: 180 }}>
                <label>To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          {mode === "all" && (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Searches the last 365 days.</p>
          )}
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !restId || mobile.length < 10}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
        {error && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>{error}</p>}
      </div>

      {bills && bills.length === 0 && (
        <div className="panel">
          <p style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>
            No bills found for this number in the selected window.
          </p>
        </div>
      )}

      {bills && bills.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            <div className="panel" style={{ marginBottom: 0, padding: 16 }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 22 }}>{bills.length}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Bills found</div>
            </div>
            <div className="panel" style={{ marginBottom: 0, padding: 16 }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 22 }}>{fmtMoney(total)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Total spend</div>
            </div>
            <div className="panel" style={{ marginBottom: 0, padding: 16 }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 22 }}>{repeatedCount}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Repeated bill numbers</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-ghost" onClick={downloadCSV}>
              Download CSV
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bills.map((b, i) => (
              <div key={i} className="panel" style={{ marginBottom: 0, padding: 0, overflow: "hidden" }}>
                <div
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  style={{
                    padding: "14px 18px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14 }}>
                      Bill {b.billNumber}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {fmtDate(b.orderTime)} · {fmtTime(b.orderTime)} · <span className="tag tag-forest">{b.type}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 15 }}>
                      {fmtMoney(b.amount)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{b.paymentType}</div>
                  </div>
                </div>
                {openIdx === i && (
                  <div style={{ padding: "0 18px 16px", borderTop: "1px dashed var(--line)", margin: "0 18px" }}>
                    {b.items.map((it, j) => (
                      <div
                        key={j}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          padding: "7px 0",
                          borderBottom: "1px dashed #efe6d6",
                        }}
                      >
                        <span>
                          {it.name} <span style={{ color: "var(--muted)", fontSize: 12 }}>× {it.quantity}</span>
                        </span>
                        <span style={{ fontWeight: 600 }}>{fmtMoney(it.subtotal)}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)", fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                        <span>Subtotal</span>
                        <span>{fmtMoney(b.subtotal)}</span>
                      </div>
                      {b.discount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                          <span>Discount</span>
                          <span>-{fmtMoney(b.discount)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                        <span>Tax</span>
                        <span>{fmtMoney(b.taxTotal)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, paddingTop: 6 }}>
                        <span>Total paid</span>
                        <span>{fmtMoney(b.amount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
