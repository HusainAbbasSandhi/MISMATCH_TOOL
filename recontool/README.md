# Reelo Reconciliation Tool

Internal support tool for reconciling POS bills against Reelo. One tool, one job:

**Bill Reconciliation** — upload a POS export and a Reelo export, map the columns once, get a mismatch report as a downloadable Excel file. Runs entirely in the browser — no database, nothing stored on a server.

No user database, no accounts table — the whole team shares one password.

(Customer Lookup and Automated Reconciliation were removed from this version at your request — the dashboard now shows only the one tool.)


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

5. Click **Deploy**. Vercel builds it and gives you a live URL like `your-project.vercel.app` within a couple of minutes.
6. Share that URL + the `APP_PASSWORD` with your support team. That's it — it's live.

### Updating it later
Any time you want to change something, edit the code in GitHub (or push via git) — Vercel automatically redeploys on every push to the main branch. You never need to manually "restart a server" or touch a database.

---

## Recent fix worth knowing about

Real Reelo exports use date formats like `20 Jun, 2026 |` — the trailing pipe character broke the original date parser, which silently mis-read it and caused entire days of real bills to be wrongly flagged "Missing in Reelo." This is fixed in `lib/fileParsing.ts`: date parsing now tries several explicit formats (including this one) and, if a date genuinely can't be read, shows `UNPARSED: <value>` directly in the report and a warning banner on the results screen — instead of silently guessing wrong. If you ever see that warning, check the date column mapping or the raw date format in that file before trusting the report.

## What's intentionally not built

- **Automated reconciliation** (pulling data by restID/date instead of file upload), **Customer Lookup**, and **Datadog integration** were all removed/parked per your call. If you want any of these back later, they're straightforward to re-add — ask and I can bring them back in.
- **Ticket lifecycle tracking** (open → investigating → resolved) — the tool currently produces a fresh report each run with no memory of past runs, since there's no database. If you want this later, it's the first feature that would require adding a real database (e.g. Vercel Postgres or Supabase) — everything else in this app deliberately avoids needing one.

## Files that matter if you want to change something

- `lib/matching.ts` — the actual bill-matching rules (exact match → normalized trailing-digit match → ambiguous fallback). Edit this if the matching logic itself needs to change.
- `lib/fileParsing.ts` — how uploaded CSV/Excel files get read into rows, including the date-format handling above.
- `lib/reportExport.ts` — how the final Excel report is assembled (sheet names, columns).
- `app/reconcile/page.tsx` — the upload → map → results wizard UI, including the search box and column sorting.

