# Sea Sculpt Club website (Cloudflare Pages)

- `public/` – the website pages, styles, scripts and images (what visitors see)
- `functions/api/` – the server code: checkout, Stripe webhook, bookings page data, blog posts (Airtable), forms (Resend), eGift sending
- `gift-timer/worker.js` – code for the small hourly "gift timer" Worker (pasted into Cloudflare by hand, not deployed from here)

Cloudflare Pages build settings: Framework preset **None**, Build command **(empty)**, Build output directory **public**.
Needs a D1 database bound as **DB**, plus the variables listed in the setup steps.

To update the site: replace files in this folder, then Commit and Push in GitHub Desktop. Cloudflare publishes automatically.
