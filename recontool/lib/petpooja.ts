// Thin wrapper around Petpooja's order data.
//
// IMPORTANT — verify before flipping FEATURE_LOOKUP_LIVE to "true":
// We have Petpooja API credentials, but the exact endpoint/payload shape for
// "get all orders for a restID on a given date" should be confirmed against
// your Petpooja Postman collection / API docs before this goes live. The
// request below is written to match Petpooja's commonly-documented
// `generic_get_orders`-style partner endpoint, but field names and the auth
// header format can differ per account setup — check a real response in
// the Network tab (as discussed) and adjust `fetchOrdersForDate` below.
//
// Until then, FEATURE_LOOKUP_LIVE stays "false" and this returns realistic
// mock data so the UI and matching logic can be built/tested against it.

export interface PetpoojaOrder {
  billNumber: string;
  orderTime: string; // ISO datetime
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

const LIVE = process.env.FEATURE_LOOKUP_LIVE === "true";

export async function fetchOrdersForDate(restId: string, date: string): Promise<PetpoojaOrder[]> {
  if (!LIVE) {
    return mockOrdersForDate(restId, date);
  }

  const base = process.env.PETPOOJA_API_BASE;
  const appKey = process.env.PETPOOJA_APP_KEY;
  const appSecret = process.env.PETPOOJA_APP_SECRET;
  const accessToken = process.env.PETPOOJA_ACCESS_TOKEN;

  if (!base || !appKey || !appSecret || !accessToken) {
    throw new Error("Petpooja credentials are not fully configured on the server.");
  }

  // TODO — confirm this path and payload against Petpooja's real API docs.
  const res = await fetch(`${base}/order/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "app-key": appKey,
      "app-secret": appSecret,
      "access-token": accessToken,
    },
    body: JSON.stringify({ restID: restId, date }),
  });

  if (!res.ok) {
    throw new Error(`Petpooja API returned ${res.status}`);
  }

  const data = await res.json();
  // TODO — map Petpooja's real response shape into PetpoojaOrder[] here.
  return (data.orders || []).map((o: any) => ({
    billNumber: o.OrderInfo?.Restaurant?.details?.invoice_no || o.orderID,
    orderTime: o.created_on,
    type: o.order_type,
    paymentType: o.payment_type,
    mobile: o.customer?.mobile || "",
    customerName: o.customer?.name || "",
    items: (o.OrderItem?.details || []).map((it: any) => ({
      name: it.item_name,
      quantity: Number(it.item_quantity),
      rate: Number(it.item_price),
      subtotal: Number(it.item_total_price ?? it.item_price * it.item_quantity),
    })),
    discount: Number(o.discount_total || 0),
    taxTotal: Number(o.tax_total || 0),
    subtotal: Number(o.item_total || 0),
    amount: Number(o.total || 0),
  }));
}

function mockOrdersForDate(restId: string, date: string): PetpoojaOrder[] {
  const seed: Record<string, PetpoojaOrder[]> = {
    "2026-07-02": [
      {
        billNumber: "abc/01/2514",
        orderTime: `${date}T13:42:00`,
        type: "DINE-IN",
        paymentType: "Cash",
        mobile: "9876543210",
        customerName: "Ritu Shah",
        items: [
          { name: "Paneer Tikka", quantity: 1, rate: 280, subtotal: 280 },
          { name: "Butter Naan", quantity: 3, rate: 45, subtotal: 135 },
          { name: "Dal Makhani", quantity: 1, rate: 220, subtotal: 220 },
        ],
        discount: 30,
        taxTotal: 52.65,
        subtotal: 635,
        amount: 657.65,
      },
    ],
    "2026-06-24": [
      {
        billNumber: "abc/01/2498",
        orderTime: `${date}T20:05:00`,
        type: "TAKEAWAY",
        paymentType: "UPI",
        mobile: "9876543210",
        customerName: "Ritu Shah",
        items: [
          { name: "Veg Biryani", quantity: 2, rate: 210, subtotal: 420 },
          { name: "Raita", quantity: 1, rate: 40, subtotal: 40 },
        ],
        discount: 0,
        taxTotal: 23,
        subtotal: 460,
        amount: 483,
      },
    ],
  };
  return seed[date] || [];
}

// Mock mode still needs to answer "all time" / range queries without the
// caller having to know which dates have data — this lists the seeded
// mock dates so the API route can loop over exactly those.
export function mockAvailableDates(): string[] {
  return ["2026-06-24", "2026-07-02"];
}

export const isLive = LIVE;
