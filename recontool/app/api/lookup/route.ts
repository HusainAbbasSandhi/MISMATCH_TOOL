import { NextRequest, NextResponse } from "next/server";
import { fetchOrdersForDate, isLive } from "@/lib/petpooja";

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export async function POST(req: NextRequest) {
  const { restId, mobile, mode, date, from, to } = await req.json();

  if (!restId || !mobile) {
    return NextResponse.json({ error: "restID and mobile number are required." }, { status: 400 });
  }

  let dates: string[];
  if (mode === "single") {
    if (!date) return NextResponse.json({ error: "Date is required for single-date mode." }, { status: 400 });
    dates = [date];
  } else if (mode === "range") {
    if (!from || !to) return NextResponse.json({ error: "From and To dates are required." }, { status: 400 });
    dates = dateRange(from, to);
  } else {
    // "All time" — capped to the last 365 days to keep this fast and bounded.
    const today = new Date();
    const yearAgo = new Date();
    yearAgo.setDate(today.getDate() - 365);
    dates = dateRange(yearAgo.toISOString().slice(0, 10), today.toISOString().slice(0, 10));
  }

  if (dates.length > 366) {
    return NextResponse.json({ error: "Date range too large — please narrow it to a year or less." }, { status: 400 });
  }

  try {
    const results = await Promise.all(dates.map((d) => fetchOrdersForDate(restId, d)));
    const cleanMobile = String(mobile).replace(/\D/g, "");
    const bills = results.flat().filter((o) => o.mobile.replace(/\D/g, "") === cleanMobile);
    bills.sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime());
    return NextResponse.json({ bills, live: isLive, datesSearched: dates.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lookup failed." }, { status: 500 });
  }
}
