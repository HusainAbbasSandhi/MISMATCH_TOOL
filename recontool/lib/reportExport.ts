import * as XLSX from "xlsx";
import type { ReconciledRow, MatchType } from "./matching";

const SHEETS: { title: string; types: MatchType[] }[] = [
  { title: "Missing in Reelo", types: ["Missing in Reelo"] },
  { title: "Missing in POS", types: ["Missing in POS"] },
  { title: "Amount Mismatch", types: ["Amount Mismatch"] },
  { title: "Ambiguous", types: ["Ambiguous"] },
  { title: "Matched (Exact)", types: ["Exact"] },
  { title: "Matched (Normalized)", types: ["Normalized"] },
];

const COLUMNS = [
  { key: "matchType", label: "Match Type" },
  { key: "posBillNumber", label: "POS Bill Number" },
  { key: "reeloBillNumber", label: "Reelo Bill Number" },
  { key: "billDate", label: "Bill Date" },
  { key: "billTime", label: "Bill Time" },
  { key: "mobile", label: "Mobile Number" },
  { key: "posAmount", label: "POS Amount" },
  { key: "reeloAmount", label: "Reelo Amount" },
  { key: "difference", label: "Difference" },
  { key: "posOccurrence", label: "POS Occurrence" },
  { key: "reeloOccurrence", label: "Reelo Occurrence" },
  { key: "note", label: "Note" },
] as const;

function rowsToSheetData(rows: ReconciledRow[]) {
  const header = COLUMNS.map((c) => c.label);
  const body = rows.map((row) => COLUMNS.map((c) => (row as any)[c.key] ?? ""));
  return [header, ...body];
}

export function buildReportWorkbook(rows: ReconciledRow[], meta: { generatedAt: string; posFile: string; reeloFile: string }) {
  const wb = XLSX.utils.book_new();

  // Summary sheet first, so whoever opens the file sees the headline numbers
  // before anything else — this is the "dumb proof" front page.
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.matchType] = (counts[row.matchType] || 0) + 1;

  const summaryData = [
    ["Reconciliation Summary"],
    ["Generated at", meta.generatedAt],
    ["POS file", meta.posFile],
    ["Reelo file", meta.reeloFile],
    [],
    ["Category", "Count", "What it means"],
    ["Exact match", counts["Exact"] || 0, "Bill number matched exactly on both sides, amount matches."],
    [
      "Normalized match",
      counts["Normalized"] || 0,
      "Bill number formats differed (e.g. abc/01/2514 vs 2514) but matched after normalizing — amount matches.",
    ],
    ["Amount Mismatch", counts["Amount Mismatch"] || 0, "Same bill matched on both sides, but the amounts differ."],
    ["Missing in Reelo", counts["Missing in Reelo"] || 0, "Bill exists in POS but no matching bill found in Reelo."],
    ["Missing in POS", counts["Missing in POS"] || 0, "Bill exists in Reelo but no matching bill found in POS."],
    [
      "Ambiguous",
      counts["Ambiguous"] || 0,
      "Multiple possible matches found by normalized number on the same date — needs manual review.",
    ],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  for (const sheetDef of SHEETS) {
    const sheetRows = rows.filter((r) => sheetDef.types.includes(r.matchType));
    const data = rowsToSheetData(sheetRows);
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet["!cols"] = COLUMNS.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, sheet, sheetDef.title.slice(0, 31));
  }

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}
