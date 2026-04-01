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

### Stage 1 — Local single-file app (CURRENT)
- App builds to a single HTML file that can be shared via WhatsApp
- PT opens the file on his iPhone, Pierre can open it on his Android
- All data (clients, sessions, messages) stored in localStorage on the device
- Each device has its own independent data
- Workflow: Pierre develops → builds → sends file via WhatsApp → PT opens on iPhone

### Stage 2 — Cloud-synced data (FUTURE)
- App data should be stored in the cloud so Pierre and the PT see the same data
- Options to explore: Google account storage (PT's Google account with Pierre access), GitHub-based storage, or a lightweight backend
- Goal: when PT adds a client or schedules a session, Pierre can see it too (and vice versa)

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
