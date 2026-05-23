# Newsletter signup → email list (lightweight, free, portable)

> **Status note (post-migration):** the signup form now lives in
> `src/components/EmailSignup.tsx`, and `APPS_SCRIPT_URL` is supplied via the
> `VITE_APPS_SCRIPT_URL` env var (see `src/game/config.ts`) rather than edited
> into source. The Apps Script + Google Sheet deploy steps below are still
> current; the `game/index.html:NNNN` line references are historical (that
> file was removed once the Vite build went live).

## Context

The signup form at [game/index.html:3709](game/index.html:3709) is currently UI-only — the submit handler just flips a local `done` flag and shows "You're on the list," but no email is ever sent or stored anywhere. The site is a single static `index.html` (React 18 via CDN, no build step) deployed to **Vercel** from the `game/` directory.

Goal: capture submitted emails into a list **somewhere** — without committing to a SaaS, and without a contact ceiling that would cap growth. The destination should be portable so a future Mailchimp/Kit import, sending via a transactional API, or a manual BCC blast all remain trivial.

Volume expected today: <50/month, but the design should not assume that ceiling.

We initially looked at Resend, but its free-plan **1,000-contact audience cap** is a real ceiling at the "what if this grows" scale. Apps Script + a Google Sheet wins on portability, ceiling, and commitment level — see "Alternatives considered" below.

## Recommended approach: Google Apps Script Web App → Google Sheet

A short Apps Script (deployed as a public Web App, bound to a Google Sheet) receives POSTs from the form and appends each email to the Sheet. The Sheet **is** the mailing list — export CSV for Mailchimp/Kit later, or copy the email column into BCC for a manual blast.

```
[Soar Boar form]  --POST email,source-->  [Apps Script Web App]  --appendRow-->  [Google Sheet "Soar Boar signups"]
```

No Vercel function needed for this — the form POSTs directly to the Apps Script URL. (We could route through a Vercel function for cleaner separation, but it adds moving parts without buying anything meaningful at this scale.)

### Why Apps Script over the alternatives

Surveyed the field — quick summary of why each loses to Apps Script for _this_ situation:

- **Resend**: 1,000-contact free cap is the actual ceiling, not headroom. Migrating away is a CSV import, but you'd hit the cap before deciding which destination you want.
- **Kit (formerly ConvertKit)**: 10,000 contacts free + sending included is genuinely the strongest "one tool for both" option. The real cost is commitment — Kit is a full newsletter platform with its own UI, automations, and gravity. Adopting it now is the opposite of "stay flexible."
- **Brevo / EmailOctopus / Beehiiv**: middle-tier alternatives (2,500–9,000 contacts). Each adds a SaaS account without being clearly better than Apps Script (portability) or Kit (headroom).
- **Mailchimp**: 500-contact free cap. Worse than Resend on the dimension we care about. Also already explicitly off the table.
- **Vercel Postgres / Cloudflare D1**: would give unlimited contacts under your own roof, but requires schema, insert logic, a piece of infra to keep alive — overkill for what is, today, a tiny weekly newsletter.

If the user later decides they DO want one tool that does collect-and-send, **Kit is the right escape hatch** — it's a one-CSV import from the Sheet.

### Apps Script effective limits

- Sheet: 10 million cells max, ~millions of email rows fit easily
- Apps Script Web App: 20,000 URL fetch executions/day for free Google accounts (more than enough)
- Web App execution time: 6 min/execution, irrelevant for an append-one-row operation
- Effective contact cap: **none in practice**

### Tradeoffs to know

- Need a separate path for _sending_ eventually (manual BCC for now; Kit / Mailchimp / Resend / something else later)
- Bolts a Google account dependency into the stack (the user already has one; not an issue)
- Apps Script Web Apps have a known CORS quirk (preflight requests don't get CORS headers) — workaround is to POST as `Content-Type: text/plain`, which avoids the preflight entirely. Plan handles this; it's a one-line consideration in the form code.

## How it works end-to-end

1. **Form** at [game/index.html:3712](game/index.html:3712): replace the no-op `submit` with `fetch(APPS_SCRIPT_URL, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({email, source:'homepage', website})})`. Track `status` state (`idle | submitting | done | error`). Keep existing "You're on the list" copy for `done`. Show a minimal error if the fetch fails, leaving the typed email in place for retry.
2. **Honeypot**: add a hidden `<input name="website" tabIndex={-1} autoComplete="off">` (CSS: `position:absolute; left:-9999px; opacity:0;`). The script silently ignores any submission where `website` is non-empty — returns success to the client so bots don't learn they're being filtered.
3. **Apps Script `doPost(e)`** (~30 lines, bound to the Sheet):
   - Parses JSON from `e.postData.contents`
   - Validates email with a cheap regex
   - Honeypot check: if `website` is set, return `{ok:true}` _without_ appending
   - Dedupe: read column B as a range, skip append if email already exists
   - Append row: `[new Date(), email, source]`
   - Return `ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON)`
4. **The Sheet** has columns `timestamp | email | source`. That's the mailing list.

Why `Content-Type: text/plain`: it's a "simple request" per CORS spec, so the browser skips the preflight `OPTIONS` that Apps Script Web Apps don't handle well. The Apps Script response includes `Access-Control-Allow-Origin: *` automatically for Web Apps deployed with "Anyone" access, so the browser can read `{ok:true}` from the response.

## Files to modify / create

- **Modify** [game/index.html:3708-3743](game/index.html:3708) — `EmailSignup` component:
  - Add a `const APPS_SCRIPT_URL = '...'` near the component (or at the top of the script section). Public-by-design URL; not a secret.
  - Add the honeypot `<input>`.
  - Rewrite `submit` to `async`, do the `fetch`, handle `submitting` / `done` / `error` states.
- **No** Vercel function, **no** `package.json`, **no** `vercel.json`, **no** env vars.
- All other files unchanged.

## One-time setup (outside the codebase)

1. New Google Sheet → name it "Soar Boar signups" → first row: `timestamp | email | source`.
2. `Extensions → Apps Script`. Paste the `doPost(e)` (~30 lines). Save.
3. `Deploy → New deployment → Web app`. Execute as: _Me_. Who has access: _Anyone_. Authorize when prompted. Copy the resulting `/exec` URL.
4. Paste the URL into the `APPS_SCRIPT_URL` constant in `game/index.html`.
5. Commit and push. Vercel auto-redeploys.

Note: every time you change the Apps Script code, you need to "Manage deployments → edit → new version" to publish — easy to forget. The deployment URL stays the same.

## Verification

- **Local preview** (optional): open `game/index.html` directly in a browser, submit a test email. No build step. (The Apps Script POST is cross-origin from `file://`, which behaves like a real origin for our `text/plain` request.)
- **End-to-end on preview deploy**:
  1. Push to a branch → open the Vercel preview URL
  2. Submit a test email → success UI shows
  3. Open the Sheet → confirm the new row appears with current timestamp
  4. Submit the same email again → no duplicate row, UI still shows success
  5. In DevTools, set the honeypot input's value to `"x"` and submit → no new row in the Sheet; UI still shows success (don't tip off bots)
  6. In DevTools, set Network to "Offline" and submit → error state shows, email stays in input
- **Production check** on `soarboar.com` after merging to main.

## Failure points at scale

The realistic ceilings, in order of likelihood:

1. **Apps Script daily URL Fetch quota: 20,000/day** for personal Google accounts. A signup form would need ~833/hour sustained to hit this — basically a flash-crowd-of-a-flash-crowd. **What happens at limit**: Apps Script returns an error; the form shows the error state; users retry tomorrow. No data loss to existing entries.
2. **Sheet size: 10 million cells.** At 3 columns/row, that's ~3.3M rows. Effectively never.
3. **Sheet write concurrency**: Apps Script serializes writes to a Sheet, so a true burst of simultaneous submits will queue. With sub-second appends, a burst of 50 concurrent signups completes in seconds. Worst case: a few users see a brief lag. No data loss.
4. **Apps Script execution time: 6 min max.** Our function runs in <500ms. Non-issue.

Compared to Resend's 1,000-contact ceiling, Apps Script's effective ceiling is several orders of magnitude higher and not on a billing curve.

### Defensive patterns worth adding

- **In the script**: wrap the append in a `try/catch`, log errors to `Logger` (or to a separate "errors" sheet tab). Apps Script logs are persistent in the project's execution log.
- **Optional fallback notification**: have the script also `MailApp.sendEmail(yourAddress, 'New signup', email)` so each signup pings your inbox. Apps Script daily mail quota is 100/day for personal accounts — plenty of buffer at this volume, and gives you a real-time pulse without checking the Sheet. _Skip for now; add if you want signup notifications._

## When to revisit

- **Want to send via a real ESP**: import the Sheet's CSV into Kit (10k free tier) or Mailchimp. The form's `APPS_SCRIPT_URL` can stay pointed at the Sheet so the Sheet remains the source of truth, OR you swap the form to POST directly to the ESP's API at that point. Defer this call.
- **Spam volume creeps up**: add Cloudflare Turnstile (free, drop-in widget); the Apps Script verifies the token before appending.
- **Outgrow Apps Script quotas** (unlikely): swap to a Vercel function writing to Vercel Postgres or Cloudflare D1. The Sheet's CSV imports anywhere.
