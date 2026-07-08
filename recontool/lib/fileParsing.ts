import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { SourceRow } from "./matching";

export interface ParsedFile {
  headers: string[];
  rows: SourceRow[];
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<SourceRow>(text, { header: true, skipEmptyLines: true });
    const headers = parsed.meta.fields || [];
    return { headers, rows: parsed.data };
  }

  // Treat everything else (.xlsx, .xls) as a spreadsheet.
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<SourceRow>(firstSheet, { defval: "" });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

// Excel stores dates as serial numbers sometimes; this normalizes a cell
// value (string, Excel serial, or JS Date) down to YYYY-MM-DD / HH:MM.
export function splitDateTime(value: string | number | undefined): { date: string; time: string } {
  if (value === undefined || value === "") return { date: "", time: "" };

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      const time =
        parsed.H !== undefined ? `${String(parsed.H).padStart(2, "0")}:${String(parsed.M).padStart(2, "0")}` : "";
      return { date, time };
    }
  }

  const str = String(value).trim();
  // Try native Date parsing first (handles "2026-07-02 13:42:00", ISO, etc.)
  const d = new Date(str);
  if (!isNaN(d.getTime()) && /\d{4}/.test(str)) {
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
      2,
      "0"
    )}`;
    const hasTime = /\d{1,2}:\d{2}/.test(str);
    const time = hasTime ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";
    return { date, time };
  }

  // Fall back: split on whitespace, assume "date time" layout.
  const [datePart, timePart] = str.split(/\s+/);
  return { date: datePart || str, time: timePart || "" };
}

export function toNumber(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[₹,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}
