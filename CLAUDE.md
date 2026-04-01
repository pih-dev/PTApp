# PTApp — Personal Trainer Client Management App

## Session Startup
- Remind the user to run `/rc "PTApp"` for remote phone control if they haven't already
- This project uses bypass permissions mode (yolo) — no need to ask for tool confirmations
- Commit to git frequently — after every significant change, not batched at the end
- Keep memory/session_log.md updated mid-session with key inputs and decisions

## What This Project Is
A mobile-first web app for a personal trainer (the end user) to manage his gym clients. Developed by Pierre (pih-dev on GitHub). The PT uses the app on his iPhone; Pierre tests on his Android.

## Roles
- **Developer**: Pierre (pierreishere@gmail.com / GitHub: pih-dev). Builds and maintains the app.
- **End User**: Pierre's personal trainer. Uses the app daily to manage clients, schedule sessions, and send WhatsApp messages.

## Roadmap

### Stage 1 — Web app with cloud sync (CURRENT)
- Hosted on GitHub Pages: https://pih-dev.github.io/PTApp/
- Data synced to GitHub repo (makdissi-dev/ptapp-data) via GitHub API
- Both PT and Pierre see the same data
- PT bookmarks the URL on his iPhone, Pierre on Android

### Stage 2 — Native app (FUTURE)
- Publish to Apple App Store and Google Play Store
- Requires a final app name (not "PTApp")
- May need a proper backend to replace GitHub API storage

## Core Features
- **Client Management**: Add/edit/delete clients with name, phone (with country code), and notes
- **Session Scheduling**: Book training sessions with type, date, time, duration
- **Session Tracking**: Mark sessions as confirmed, completed, or cancelled
- **WhatsApp Messaging**: Send booking confirmations and reminders via WhatsApp (opens wa.me links)
- **Dashboard**: Overview stats showing today's sessions, upcoming bookings, confirmed count, weekly total
- **Persistent Storage**: All data saved to localStorage on the device

## Tech Stack
- React 18 (with hooks: useState, useReducer, useEffect)
- Vite for dev server and build
- Pure CSS (no framework) — dark theme, mobile-first
- Google Fonts: DM Sans
- No backend — all data in browser localStorage

## Project Structure
```
PTApp/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite config
├── CLAUDE.md           # This file
└── src/
    ├── main.jsx        # React mount point
    ├── App.jsx         # Main app with routing/tabs
    ├── styles.css      # All styles
    ├── utils.js        # Helpers, constants, storage
    └── components/
        ├── Dashboard.jsx
        ├── Clients.jsx
        ├── Schedule.jsx
        ├── Sessions.jsx
        └── Modal.jsx
```

## Data Preservation Rules (CRITICAL)
- **NEVER delete or lose user data.** The PT's clients and sessions are real business records.
- **Backward compatible always.** When the data schema changes, write a migration in `utils.js` (`migrateData`) that upgrades old data to the new format. Never require the user to re-enter anything.
- **Version the data.** The `_dataVersion` field in the data tracks the schema version. Increment `DATA_VERSION` and add a migration step for each schema change.
- **Preserve history.** Even if a feature is removed, keep the data that was collected. Archive it under a different key if needed, but never drop it.
- **Test migrations.** Before deploying a schema change, verify that existing data (from the PT's live app) loads correctly in the new version.

## App Name
- "PTApp" is a working title, NOT the final name.
- A unique name is needed before publishing to Apple App Store / Google Play Store.
- The name must not be already taken or trademarked in the fitness/trainer app space.
- TODO: brainstorm and research a final name before the native app stage.

## Key Design Decisions
- Single-page app with bottom tab navigation (Home, Clients, Schedule, Sessions)
- WhatsApp integration uses `https://wa.me/{phone}?text={message}` — no API needed
- Phone numbers must include country code (e.g. +961 for Lebanon)
- Session types: Strength, Cardio, Flexibility, HIIT, Recovery, Custom
- Session statuses: Scheduled -> Confirmed -> Completed (or Cancelled)
- Dark theme with red (#E8453C) accent color

## How to Run (Development)
```bash
npm install
npm run dev
```

## How to Build and Share
```bash
npm run build
# Produces a single dist/index.html (~176 KB) with all JS and CSS inlined
# Send dist/index.html via WhatsApp to the PT — he opens it on his iPhone
```
The `vite-plugin-singlefile` plugin inlines all JS and CSS into one HTML file.
Google Fonts (DM Sans) still loads from the internet — device needs connectivity.
