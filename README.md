# VYRL Studio

VYRL Studio is a mobile-first progressive web app prototype for turning cultural signals into beat-synced short-form video plans. It is designed to run well in Safari on modern iPhones and can be added to the Home Screen.

## Run locally

Autopilot requires the included Node server. On this machine, run:

```powershell
.\start.ps1
```

Open `http://localhost:4173`.

To open the app from an iPhone on the same Wi-Fi network, use the computer's LAN IP instead of `localhost`, for example `http://192.168.1.20:4173`. A production deployment should use HTTPS and authentication.

## Included

- Responsive trend radar and momentum cards
- Editable hook and topic builder
- Fictional adult AI-presenter presets
- Sound-energy profiles and generated cut markers
- CapCut-oriented build-sheet sharing/download
- Local project library using `localStorage`
- PWA manifest and offline service worker
- iPhone safe-area and Home Screen support
- Persistent server-side Autopilot schedule
- Automatic script, caption, hashtag, presenter, and vertical-media generation
- Approval queue and automatic due-post processing
- TikTok, Instagram, YouTube, and generic webhook publisher adapters
- Sandbox publishing when no live account is connected
- Explainable opportunity scoring across velocity, fit, novelty, saturation, and hook strength
- Modeled retention/share forecasts with explicit confidence and non-analytics labeling
- Automated quality gates before publishing
- Always-on hook experiments with cohort allocation
- Command-center metrics, ranked opportunities, filters, and bulk queue operations
- Persistent operational event telemetry

## Autopilot

Autopilot stores its schedule and queue in `data/autopilot.json`. Generated vertical media is written to `generated/`. Both folders are created automatically.

1. Open the **Autopilot** tab.
2. Choose post times, approval behavior, and platforms.
3. Keep **Approval gate** on while testing.
4. Use **Generate + run now** to create a complete post package immediately.
5. Approve or publish from the queue.

With no credentials, publishing completes in sandbox mode so the full workflow can be tested without touching a real social account.

## Intelligence layer

Every generated post receives a deterministic, explainable model card:

- Opportunity score
- Trend velocity
- Audience fit
- Novelty and saturation
- Hook strength
- Predicted retention and share rate
- Confidence band
- Experiment cohort
- Quality and rights checks

These are product-model estimates, not real social-platform analytics. The UI labels them accordingly. Once live analytics are connected, the scoring functions in `server.cjs` are the boundary to replace with trained ranking, calibration, and measurement services.

The server exposes operational state through:

- `GET /api/automation`
- `GET /api/intelligence`
- `POST /api/automation/bulk`

The current JSON persistence layer is intentionally local-first. At production scale, replace it with a transactional database, durable job queue, object storage, secret manager, metrics pipeline, and regionally redundant workers.

## Connect live publishing

Copy `.env.example` to `.env` and add server-side credentials. Do not put tokens in `app.js` or enter them into the browser UI.

Live platform publishing also requires:

- An approved developer app and OAuth scopes for each platform
- An HTTPS `PUBLIC_BASE_URL` that the platform can fetch generated media from
- Provider-specific account eligibility and app review
- `FFMPEG_PATH` for MP4 generation and YouTube uploads

The generic `VYRL_PUBLISH_WEBHOOK_URL` is the simplest production bridge to services such as Make, Zapier, Buffer, or a custom publishing worker.

Access tokens expire. A production deployment needs an OAuth callback and refresh-token store; `.env` tokens are suitable only for controlled development.

## Important integration boundaries

This is a working product prototype, not a scraper. The trend cards and sound profiles in `app.js` are illustrative because live platform trends, commercial sounds, and avatar generation require approved data providers, credentials, and rights checks.

For production:

1. Replace `trendSignals` with a server-side feed from licensed/approved sources such as Google Trends, Reddit, YouTube, or a social-listening provider. Do not expose provider keys in the browser.
2. Replace presenter presets with a provider that explicitly permits commercial avatar and voice use, or use creator-owned footage and voice.
3. Resolve the currently licensed trending sound inside CapCut at publish time. The build sheet intentionally exports timing and energy, not copyrighted audio.
4. Add authentication, encrypted token storage, OAuth refresh, cloud project storage, rate limiting, moderation, analytics, and a privacy policy before public launch.

## CapCut handoff

CapCut does not expose a stable public browser API for arbitrary project creation. VYRL therefore generates a portable edit build sheet with the voiceover, timing, beat markers, scene plan, and rights checklist. On iPhone it uses the native Share Sheet when available; otherwise it downloads a text file.

## Generated visual

`assets/creator-hero.png` was generated with the built-in image generation tool for this project using an original fictional adult creator prompt. It contains no intended public-figure likeness or brand marks.

## License / Usage

Copyright © 2026 Patrick Parke. All rights reserved.

This project is public for portfolio, review, and demonstration purposes only. No permission is granted to copy, modify, distribute, sublicense, sell, or use this code, design, scoring logic, written materials, visual assets, automation flow, or project structure in another product or service without written permission from the author.
