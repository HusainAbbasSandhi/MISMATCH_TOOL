"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { parseFile, splitDateTime, toNumber, ParsedFile } from "@/lib/fileParsing";
import { reconcile, summarize, MappedRecord, ReconciledRow } from "@/lib/matching";
import { buildReportWorkbook, downloadWorkbook } from "@/lib/reportExport";

type FieldKey = "billNumber" | "billDate" | "billTime" | "amount" | "mobile";

const FIELDS: { key: FieldKey; label: string; required: boolean }[] = [
  { key: "billNumber", label: "Bill Number", required: true },
  { key: "billDate", label: "Bill Date (or Date+Time combined)", required: true },
  { key: "billTime", label: "Bill Time (leave blank if combined with date)", required: false },
  { key: "amount", label: "Amount", required: true },
  { key: "mobile", label: "Mobile Number", required: false },
];

type Mapping = Partial<Record<FieldKey, string>>;

const STEPS = ["Upload", "Map columns", "Generate"];

export default function ReconcilePage() {
  const [step, setStep] = useState(1);

  const [posFile, setPosFile] = useState<File | null>(null);
  const [reeloFile, setReeloFile] = useState<File | null>(null);
  const [posParsed, setPosParsed] = useState<ParsedFile | null>(null);
  const [reeloParsed, setReeloParsed] = useState<ParsedFile | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  const [posMapping, setPosMapping] = useState<Mapping>({});
  const [reeloMapping, setReeloMapping] = useState<Mapping>({});

  const [rows, setRows] = useState<ReconciledRow[] | null>(null);
  const [reportMeta, setReportMeta] = useState({ generatedAt: "", posFile: "", reeloFile: "" });
  const [activeTab, setActiveTab] = useState<string>("Missing in Reelo");

  async function handleFile(side: "pos" | "reelo", file: File) {
    setParseError("");
    setParsing(true);
    try {
      const parsed = await parseFile(file);
      if (side === "pos") {
        setPosFile(file);
        setPosParsed(parsed);
      } else {
        setReeloFile(file);
        setReeloParsed(parsed);
      }
    } catch (e) {
      setParseError(`Could not read ${file.name}. Make sure it's a valid CSV or Excel file.`);
    } finally {
      setParsing(false);
    }
  }

  function canProceedToMap() {
    return posParsed && reeloParsed;
  }

  function mappingComplete(mapping: Mapping) {
    return FIELDS.filter((f) => f.required).every((f) => mapping[f.key]);
  }

  function buildRecords(parsed: ParsedFile, mapping: Mapping): MappedRecord[] {
    return parsed.rows.map((row) => {
      const rawDate = mapping.billDate ? row[mapping.billDate] : "";
      const { date, time } = splitDateTime(rawDate as any);
      const explicitTime = mapping.billTime ? String(row[mapping.billTime] ?? "") : "";
      return {
        billNumber: String(mapping.billNumber ? row[mapping.billNumber] ?? "" : "").trim(),
        billDate: date,
        billTime: explicitTime || time,
        amount: toNumber(mapping.amount ? row[mapping.amount] : 0),
        mobile: String(mapping.mobile ? row[mapping.mobile] ?? "" : "").trim(),
        raw: row,
      };
    });
  }

  function generateReport() {
    if (!posParsed || !reeloParsed) return;
    const posRecords = buildRecords(posParsed, posMapping);
    const reeloRecords = buildRecords(reeloParsed, reeloMapping);
    const result = reconcile(posRecords, reeloRecords);
    setRows(result);
    setReportMeta({
      generatedAt: new Date().toLocaleString("en-IN"),
      posFile: posFile?.name || "",
      reeloFile: reeloFile?.name || "",
    });
    const firstIssue = result.find((r) => r.matchType !== "Exact" && r.matchType !== "Normalized");
    setActiveTab(firstIssue ? firstIssue.matchType : "Exact");
    setStep(3);
  }

  const summary = useMemo(() => (rows ? summarize(rows) : null), [rows]);

  function handleDownload() {
    if (!rows) return;
    const wb = buildReportWorkbook(rows, reportMeta);
    downloadWorkbook(wb, `reconciliation_report_${Date.now()}.xlsx`);
  }

  return (
    <div className="wrap">
      <div style={{ marginBottom: 8 }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "underline" }}>
          ← Back to tools
        </Link>
      </div>
      <header style={{ marginBottom: 28 }}>
        <div className="eyebrow">Bill Reconciliation</div>
        <h1 style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Upload, map, and generate the mismatch report
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 600, lineHeight: 1.55 }}>
          Files are processed in your browser and never uploaded to a server — nothing is stored.
        </p>
      </header>

      <Rail current={step} />

      {step === 1 && (
        <div className="panel">
          <div className="panel-label">1. Upload both files</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <UploadBox
              label="POS order-master export"
              file={posFile}
              parsed={posParsed}
              onFile={(f) => handleFile("pos", f)}
            />
            <UploadBox
              label="Reelo export"
              file={reeloFile}
              parsed={reeloParsed}
              onFile={(f) => handleFile("reelo", f)}
            />
          </div>
          {parsing && <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>Reading file…</p>}
          {parseError && <p style={{ fontSize: 13, color: "var(--red)", marginTop: 12 }}>{parseError}</p>}
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" disabled={!canProceedToMap()} onClick={() => setStep(2)}>
              Continue to mapping →
            </button>
          </div>
        </div>
      )}

      {step === 2 && posParsed && reeloParsed && (
        <div className="panel">
          <div className="panel-label">2. Map columns</div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
            Tell us which column in each file holds each piece of information. Bill Number and Amount are required.
            If date and time are combined in one column, map both to the same "Bill Date" field and leave "Bill Time"
            blank.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <MappingColumn title="POS file" parsed={posParsed} mapping={posMapping} setMapping={setPosMapping} />
            <MappingColumn
              title="Reelo file"
              parsed={reeloParsed}
              mapping={reeloMapping}
              setMapping={setReeloMapping}
            />
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button
              className="btn btn-primary"
              disabled={!mappingComplete(posMapping) || !mappingComplete(reeloMapping)}
              onClick={generateReport}
            >
              Generate report →
            </button>
          </div>
        </div>
      )}

      {step === 3 && rows && summary && (
        <Results
          rows={rows}
          summary={summary}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onDownload={handleDownload}
          onStartOver={() => {
            setStep(1);
            setRows(null);
            setPosFile(null);
            setReeloFile(null);
            setPosParsed(null);
            setReeloParsed(null);
            setPosMapping({});
            setReeloMapping({});
          }}
        />
      )}
    </div>
  );
}

function Rail({ current }: { current: number }) {
  return (
    <div className="rail">
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i === STEPS.length - 1 ? "0 0 auto" : 1 }}>
            <div className="rail-step">
              <div className={`rail-dot ${done ? "done" : ""} ${active ? "active" : ""}`}>
                {done ? "✓" : idx}
              </div>
              <div className={`rail-label ${active ? "active" : ""}`}>{label}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`rail-line ${done ? "done" : ""}`} style={{ marginRight: 8 }} />}
          </div>
        );
      })}
    </div>
  );
}

function UploadBox({
  label,
  file,
  parsed,
  onFile,
}: {
  label: string;
  file: File | null;
  parsed: ParsedFile | null;
  onFile: (f: File) => void;
}) {
  return (
    <label
      style={{
        border: "1.5px dashed var(--line)",
        borderRadius: 14,
        padding: 20,
        textAlign: "center",
        cursor: "pointer",
        display: "block",
        background: file ? "var(--forest-soft)" : "#fff",
      }}
    >
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div style={{ fontWeight: 700, fontFamily: "Sora, sans-serif", fontSize: 14, marginBottom: 6 }}>{label}</div>
      {file ? (
        <div style={{ fontSize: 13, color: "var(--forest)" }}>
          {file.name}
          {parsed && <div style={{ color: "var(--muted)", marginTop: 2 }}>{parsed.rows.length} rows found</div>}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Click to choose a .csv or .xlsx file</div>
      )}
    </label>
  );
}

function MappingColumn({
  title,
  parsed,
  mapping,
  setMapping,
}: {
  title: string;
  parsed: ParsedFile;
  mapping: Mapping;
  setMapping: (m: Mapping) => void;
}) {
  const previewRow = parsed.rows[0] || {};
  return (
    <div>
      <div style={{ fontWeight: 700, fontFamily: "Sora, sans-serif", fontSize: 14, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FIELDS.map((f) => (
          <div key={f.key} className="field">
            <label>
              {f.label} {f.required && <span style={{ color: "var(--red)" }}>*</span>}
            </label>
            <select
              value={mapping[f.key] || ""}
              onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value || undefined })}
            >
              <option value="">— not mapped —</option>
              {parsed.headers.map((h) => (
                <option key={h} value={h}>
                  {h} (e.g. "{String(previewRow[h] ?? "")}")
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_ORDER = ["Missing in Reelo", "Missing in POS", "Amount Mismatch", "Ambiguous", "Normalized", "Exact"];

function Results({
  rows,
  summary,
  activeTab,
  setActiveTab,
  onDownload,
  onStartOver,
}: {
  rows: ReconciledRow[];
  summary: Record<string, number>;
  activeTab: string;
  setActiveTab: (t: string) => void;
  onDownload: () => void;
  onStartOver: () => void;
}) {
  const filteredRows = rows.filter((r) => r.matchType === activeTab).slice(0, 200);
  const issueCount =
    (summary["Missing in Reelo"] || 0) +
    (summary["Missing in POS"] || 0) +
    (summary["Amount Mismatch"] || 0) +
    (summary["Ambiguous"] || 0);

  return (
    <div>
      <div className="panel" style={{ background: "var(--forest-soft)", border: "1px solid var(--forest)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 18 }}>
              {issueCount === 0 ? "No mismatches found 🎉" : `${issueCount} bill(s) need attention`}
            </div>
            <div style={{ fontSize: 13, color: "var(--forest-dark)", marginTop: 2 }}>
              {rows.length} total bills compared across both files.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={onStartOver}>
              Start over
            </button>
            <button className="btn btn-primary" onClick={onDownload}>
              Download full Excel report
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Missing in Reelo" value={summary["Missing in Reelo"] || 0} tone="red" />
        <StatCard label="Missing in POS" value={summary["Missing in POS"] || 0} tone="red" />
        <StatCard label="Amount Mismatch" value={summary["Amount Mismatch"] || 0} tone="gold" />
        <StatCard label="Ambiguous" value={summary["Ambiguous"] || 0} tone="gold" />
        <StatCard label="Matched (exact)" value={summary["Exact"] || 0} tone="forest" />
        <StatCard label="Matched (normalized)" value={summary["Normalized"] || 0} tone="forest" />
      </div>

      <div className="panel">
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {TAB_ORDER.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="btn"
              style={{
                background: activeTab === t ? "var(--forest)" : "var(--forest-soft)",
                color: activeTab === t ? "#fff" : "var(--forest)",
                fontSize: 12.5,
                padding: "8px 14px",
              }}
            >
              {t} ({summary[t] || 0})
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)", textAlign: "left" }}>
                {["POS Bill #", "Reelo Bill #", "Date", "Time", "Mobile", "POS Amt", "Reelo Amt", "Diff", "POS Occ.", "Reelo Occ.", "Note"].map(
                  (h) => (
                    <th key={h} style={{ padding: "8px 10px", whiteSpace: "nowrap", color: "var(--muted)" }}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 10px" }}>{r.posBillNumber || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{r.reeloBillNumber || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{r.billDate}</td>
                  <td style={{ padding: "8px 10px" }}>{r.billTime}</td>
                  <td style={{ padding: "8px 10px" }}>{r.mobile || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{r.posAmount ?? "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{r.reeloAmount ?? "—"}</td>
                  <td style={{ padding: "8px 10px", color: r.difference ? "var(--red)" : "inherit" }}>
                    {r.difference ?? "—"}
                  </td>
                  <td style={{ padding: "8px 10px" }}>{r.posOccurrence}</td>
                  <td style={{ padding: "8px 10px" }}>{r.reeloOccurrence}</td>
                  <td style={{ padding: "8px 10px", color: "var(--muted)" }}>{r.note}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                    Nothing in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {(summary[activeTab] || 0) > 200 && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
              Showing first 200 of {summary[activeTab]} rows — download the full Excel report to see all of them.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "red" | "gold" | "forest" }) {
  const colors = {
    red: { bg: "var(--red-soft)", fg: "var(--red)" },
    gold: { bg: "var(--gold-soft)", fg: "#8a5c17" },
    forest: { bg: "var(--forest-soft)", fg: "var(--forest)" },
  }[tone];
  return (
    <div className="panel" style={{ marginBottom: 0, padding: 16, background: colors.bg, border: "none" }}>
      <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 22, color: colors.fg }}>{value}</div>
      <div style={{ fontSize: 12, color: colors.fg, marginTop: 2, fontWeight: 600 }}>{label}</div>
    </div>
  );
}
