# Reelo Reconciliation Tool

Internal support tool with three parts:

1. **Bill Reconciliation** (live) — upload a POS export and a Reelo export, map the columns once, get a mismatch report as a downloadable Excel file. Runs entirely in the browser — no database, nothing stored on a server.
2. **Customer Lookup** (live, sample-data mode by default) — enter a restID + mobile number, see that customer's full bill history. Ships wired to realistic sample data; flip one setting to switch to live Petpooja data once the API endpoint is confirmed (see "Going live" below).
3. **Automated Reconciliation** (not built yet) — shown on the dashboard as "Coming soon" and cannot be triggered. This is the future feature that pulls POS/Reelo data automatically instead of manual uploads.

No user database, no accounts table — the whole team shares one password.

---

## Deploying this — step by step (no prior backend experience needed)

### 1. Put this code on GitHub
If you don't already have a repo for this:
1. Go to github.com, create a new repository (private is fine).
2. Upload all these files to it (GitHub's web UI has an "upload files" button — drag the whole folder in, or use `git push` if you're comfortable with git).

### 2. Import it into Vercel
1. Go to vercel.com and sign in (or create an account) with GitHub.
2. Click "Add New… → Project", pick this repository.
3. Vercel auto-detects it's a Next.js app — you don't need to change any build settings.
4. **Before clicking Deploy**, go to the "Environment Variables" section on that same screen and add these (copy the names exactly):

   | Name | Value |
   |---|---|
   | `APP_PASSWORD` | Whatever shared password you want the support team to use to log in |
   | `SESSION_SECRET` | Any long random string (doesn't need to be memorable — just paste 40 random characters) |
   | `PETPOOJA_APP_KEY` | Your Petpooja app key |
   | `PETPOOJA_APP_SECRET` | Your Petpooja app secret |
   | `PETPOOJA_ACCESS_TOKEN` | Your Petpooja access token |
   | `PETPOOJA_API_BASE` | Leave as `https://pos-biz.petpooja.com` for now (see note below) |
   | `FEATURE_LOOKUP_LIVE` | `false` (leave this as `false` until you complete the "Going live" step below) |

5. Click **Deploy**. Vercel builds it and gives you a live URL like `your-project.vercel.app` within a couple of minutes.
6. Share that URL + the `APP_PASSWORD` with your support team. That's it — it's live.

### Updating it later
Any time you want to change something, edit the code in GitHub (or push via git) — Vercel automatically redeploys on every push to the main branch. You never need to manually "restart a server" or touch a database.

---

## Going live with the Customer Lookup tool

Right now, `FEATURE_LOOKUP_LIVE=false` means the lookup tool answers using realistic sample data (try restID "any" + mobile `9876543210`) — this was intentional, so the tool is fully demoable and the UI/matching logic could be built without a confirmed Petpooja endpoint.

To connect it to real data:
1. Open `lib/petpooja.ts` in this project.
2. Confirm the real endpoint URL, request payload, and response field names against Petpooja's API docs or Postman collection for your account (open the "Reelo Logs" search page in Petpooja's dashboard, open your browser's Network tab, run a search, and see what request actually fires — that's the ground truth).
3. Update the `fetch(...)` call and the response-mapping code in `fetchOrdersForDate()` to match what you find.
4. Set `FEATURE_LOOKUP_LIVE=true` in Vercel's environment variables and redeploy.

This is the one piece that was left as "verify before launch" rather than guessed at, since getting Petpooja's exact API contract wrong would silently return incomplete or wrong customer data — worth confirming once rather than shipping a guess.

---

## What's intentionally not built yet

- **Automated reconciliation** (pulling data by restID/date instead of file upload) — shown as locked on the dashboard.
- **Datadog integration** — parked per your call; only Petpooja is wired up.
- **Ticket lifecycle tracking** (open → investigating → resolved) — the reconciliation tool currently produces a fresh report each run with no memory of past runs, since there's no database. If you want this later, it's the first feature that would require adding a real database (e.g. Vercel Postgres or Supabase) — everything else in this app deliberately avoids needing one.

## Files that matter if you want to change something

- `lib/matching.ts` — the actual bill-matching rules (exact match → normalized trailing-digit match → ambiguous fallback). This is the file to edit if the matching logic itself needs to change.
- `lib/fileParsing.ts` — how uploaded CSV/Excel files get read into rows.
- `lib/reportExport.ts` — how the final Excel report is assembled (sheet names, columns).
- `lib/petpooja.ts` — the Petpooja API wrapper described above.
- `app/reconcile/page.tsx` — the upload → map → results wizard UI.
- `app/lookup/page.tsx` — the customer lookup UI.
