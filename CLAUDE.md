# PTApp — Personal Trainer Client Management App

## What This Project Is
A web app for a personal trainer to manage gym clients. Built with React + Vite. Designed for mobile-first use on both Android and iPhone.

## Core Features
- **Client Management**: Add/edit/delete clients with name, phone (with country code), and notes
- **Session Scheduling**: Book training sessions with type, date, time, duration
- **Session Tracking**: Mark sessions as confirmed, completed, or cancelled
- **WhatsApp Messaging**: Send booking confirmations and reminders via WhatsApp (opens wa.me links)
- **Dashboard**: Overview stats showing today's sessions, upcoming bookings, confirmed count, weekly total
- **Persistent Storage**: All data saved to localStorage so it survives browser refreshes

## Tech Stack
- React 18 (with hooks: useState, useReducer, useEffect)
- Vite for dev server and build
- Pure CSS (no framework) — dark theme, mobile-first
- Google Fonts: DM Sans
- No backend — all data in browser localStorage

## Project Structure
```
ptapp-project/
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
- Session statuses: Scheduled → Confirmed → Completed (or Cancelled)
- Dark theme with red (#E8453C) accent color

## How to Run
```bash
npm install
npm run dev
```

## How to Deploy
```bash
npm run build
# Upload the 'dist' folder to any static hosting (Netlify, Vercel, GitHub Pages)
```
