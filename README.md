# STARdust / VYRL Studio

**VYRL Studio** (codename STARdust) is a mobile-first progressive web app prototype for turning cultural signals into beat-synced short-form video plans. It is designed to run well in Safari on modern iPhones and can be added to the Home Screen.

## Prototype / Demo Data Note

**This is a functional prototype with illustrative demo data.** Trend signals, hooks, and intelligence scores are hardcoded examples for demonstration purposes. Live data providers (trends, sounds, analytics) are **not connected**. All content generation uses deterministic seeds and mock models to showcase the UI/UX and automation flow without external dependencies.

## Run locally

Autopilot requires the included Node server. Run:

```bash
# On macOS/Linux or Windows with Bash
./start.ps1

# Or directly
node server.cjs
```

Open `http://localhost:4173`.

To open from an iPhone on the same Wi-Fi, use the computer's LAN IP. For production, use HTTPS and add authentication.

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

Autopilot stores its schedule and queue in `data/autopilot.json`. Generated vertical media is written to `generated/`. Both folders are created automatically (and gitignored).

1. Open the **Autopilot** tab.
2. Choose post times, approval behavior, and platforms.
3. Keep **Approval gate** on while testing.
4. Use **Generate + run now** to create a complete post package immediately.
5. Approve or publish from the queue.

With no credentials, publishing completes in sandbox mode.

## Intelligence layer

... (rest remains similar, but updated for portfolio)

## Connect live publishing

Copy `.env.example` to `.env` and fill in credentials.

## License / Usage

This project is shared for portfolio demonstration. Core behavior unchanged. See full license in LICENSE.txt.

Copyright © 2026 Patrick Parke.