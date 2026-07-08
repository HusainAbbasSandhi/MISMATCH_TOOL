// Core reconciliation logic: normalizes bill numbers across POS/Reelo formats,
// matches records, and classifies every row into one of a small set of
// outcomes the support team already recognizes from the manual process.

export type SourceRow = Record<string, string | number | undefined>;

export interface MappedRecord {
  billNumber: string;
  billDate: string; // YYYY-MM-DD
  billTime: string; // HH:MM or ""
  amount: number;
  mobile: string;
  raw: SourceRow;
}

export type MatchType =
  | "Exact"
  | "Normalized"
  | "Ambiguous"
  | "Missing in Reelo"
  | "Missing in POS"
  | "Amount Mismatch";

export interface ReconciledRow {
  matchType: MatchType;
  posBillNumber: string;
  reeloBillNumber: string;
  billDate: string;
  billTime: string;
  mobile: string;
  posAmount: number | null;
  reeloAmount: number | null;
  difference: number | null;
  posOccurrence: string; // e.g. "1 of 1", "2 of 2"
  reeloOccurrence: string;
  note: string;
}

const AMOUNT_TOLERANCE = 1; // paise-level rounding noise; treat <= ₹1 diff as a match

// Extract the longest contiguous digit run at the very end of a string, so
// "abc/01/2514" -> "2514", "ABC-2514" -> "2514", "2514" -> "2514".
export function trailingDigits(billNumber: string): string | null {
  const match = String(billNumber).trim().match(/(\d+)$/);
  return match ? match[1] : null;
}

// Compare trailing digits as integers so leading zeros don't cause a
// false mismatch (POS "0254" vs Reelo "254").
export function normalizedKey(billNumber: string): string | null {
  const digits = trailingDigits(billNumber);
  if (digits === null) return null;
  return String(parseInt(digits, 10));
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_TOLERANCE;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

export function reconcile(posRecords: MappedRecord[], reeloRecords: MappedRecord[]): ReconciledRow[] {
  const results: ReconciledRow[] = [];

  // Group Reelo records by date, then by exact bill number, so lookups stay
  // scoped to the same day (bill numbering resets daily on most POS systems).
  const reeloByDate = groupBy(reeloRecords, (r) => r.billDate);
  const matchedReelo = new Set<MappedRecord>();

  // Pre-compute occurrence labels ("1 of 2", "2 of 2") for duplicate bill
  // numbers on each side, scoped per date.
  const posOccurrence = computeOccurrence(posRecords);
  const reeloOccurrence = computeOccurrence(reeloRecords);

  for (const pos of posRecords) {
    const dayReelo = reeloByDate.get(pos.billDate) || [];
    const unmatchedDayReelo = dayReelo.filter((r) => !matchedReelo.has(r));

    // 1. Exact string match
    let candidates = unmatchedDayReelo.filter((r) => r.billNumber === pos.billNumber);
    let matchType: MatchType = "Exact";

    // 2. Fall back to normalized trailing-digit match
    if (candidates.length === 0) {
      const posKey = normalizedKey(pos.billNumber);
      if (posKey !== null) {
        candidates = unmatchedDayReelo.filter((r) => normalizedKey(r.billNumber) === posKey);
        matchType = "Normalized";
      }
    }

    if (candidates.length === 0) {
      results.push({
        matchType: "Missing in Reelo",
        posBillNumber: pos.billNumber,
        reeloBillNumber: "",
        billDate: pos.billDate,
        billTime: pos.billTime,
        mobile: pos.mobile,
        posAmount: pos.amount,
        reeloAmount: null,
        difference: null,
        posOccurrence: posOccurrence.get(pos) || "1 of 1",
        reeloOccurrence: "",
        note: "No matching bill found in Reelo for this date, by exact or normalized bill number.",
      });
      continue;
    }

    if (candidates.length > 1) {
      // Try amount as a tiebreaker before giving up and flagging ambiguous.
      const byAmount = candidates.filter((r) => amountsMatch(r.amount, pos.amount));
      if (byAmount.length === 1) {
        candidates = byAmount;
      } else {
        results.push({
          matchType: "Ambiguous",
          posBillNumber: pos.billNumber,
          reeloBillNumber: candidates.map((c) => c.billNumber).join(" / "),
          billDate: pos.billDate,
          billTime: pos.billTime,
          mobile: pos.mobile,
          posAmount: pos.amount,
          reeloAmount: null,
          difference: null,
          posOccurrence: posOccurrence.get(pos) || "1 of 1",
          reeloOccurrence: "",
          note: `${candidates.length} Reelo bills match this POS bill by normalized number on the same date — needs manual review.`,
        });
        continue;
      }
    }

    const reelo = candidates[0];
    matchedReelo.add(reelo);

    const diff = Math.round((pos.amount - reelo.amount) * 100) / 100;
    if (!amountsMatch(pos.amount, reelo.amount)) {
      results.push({
        matchType: "Amount Mismatch",
        posBillNumber: pos.billNumber,
        reeloBillNumber: reelo.billNumber,
        billDate: pos.billDate,
        billTime: pos.billTime,
        mobile: pos.mobile,
        posAmount: pos.amount,
        reeloAmount: reelo.amount,
        difference: diff,
        posOccurrence: posOccurrence.get(pos) || "1 of 1",
        reeloOccurrence: reeloOccurrence.get(reelo) || "1 of 1",
        note: matchType === "Normalized" ? "Matched by normalized bill number (formats differ)." : "",
      });
      continue;
    }

    results.push({
      matchType,
      posBillNumber: pos.billNumber,
      reeloBillNumber: reelo.billNumber,
      billDate: pos.billDate,
      billTime: pos.billTime,
      mobile: pos.mobile,
      posAmount: pos.amount,
      reeloAmount: reelo.amount,
      difference: 0,
      posOccurrence: posOccurrence.get(pos) || "1 of 1",
      reeloOccurrence: reeloOccurrence.get(reelo) || "1 of 1",
      note: matchType === "Normalized" ? "Matched by normalized bill number (formats differ)." : "",
    });
  }

  // Anything left in Reelo with no POS counterpart at all.
  for (const reelo of reeloRecords) {
    if (matchedReelo.has(reelo)) continue;
    results.push({
      matchType: "Missing in POS",
      posBillNumber: "",
      reeloBillNumber: reelo.billNumber,
      billDate: reelo.billDate,
      billTime: reelo.billTime,
      mobile: reelo.mobile,
      posAmount: null,
      reeloAmount: reelo.amount,
      difference: null,
      posOccurrence: "",
      reeloOccurrence: reeloOccurrence.get(reelo) || "1 of 1",
      note: "This bill exists in Reelo but no POS bill matched it on this date.",
    });
  }

  return results;
}

function computeOccurrence(records: MappedRecord[]): Map<MappedRecord, string> {
  const result = new Map<MappedRecord, string>();
  const groups = groupBy(records, (r) => `${r.billDate}::${r.billNumber}`);
  for (const group of groups.values()) {
    group.forEach((rec, i) => result.set(rec, `${i + 1} of ${group.length}`));
  }
  return result;
}

export function summarize(rows: ReconciledRow[]) {
  const counts: Record<MatchType, number> = {
    Exact: 0,
    Normalized: 0,
    Ambiguous: 0,
    "Missing in Reelo": 0,
    "Missing in POS": 0,
    "Amount Mismatch": 0,
  };
  for (const row of rows) counts[row.matchType]++;
  return counts;
}
