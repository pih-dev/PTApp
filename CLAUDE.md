# PTApp — Personal Trainer Client Management App

## Session Startup
- Always push to master AND deploy to gh-pages after every commit (see deploy section)
- Auto-push to GitHub after every commit — do not ask, just push
(Remote control, commit discipline, memory, and session management are in the global ~/.claude/CLAUDE.md)

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
- Wrap web app with Capacitor for iOS/Android native builds
- Publish to Apple App Store ($99/yr individual) and Google Play ($25 one-time)
- No company registration needed — individual developer accounts work
- Requires a final app name (not "PTApp")
- See `docs/stage2-publishing-guide.md` for full details (costs, liability, prerequisites)

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
- Service worker for offline support (network-first caching)
- No backend — all data in browser localStorage + GitHub API cloud sync

## Project Structure
```
PTApp/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite config
├── .gitattributes      # LF line ending normalization
├── CLAUDE.md           # This file
├── public/
│   └── sw.js           # Service worker for offline support
├── src/
│   ├── main.jsx        # React mount point + SW registration
│   ├── App.jsx         # Main app with routing/tabs
│   ├── sync.js         # GitHub API sync (makdissi-dev/ptapp-data)
│   ├── styles.css      # All styles
│   ├── utils.js        # Helpers, constants, storage
│   └── components/
│       ├── Dashboard.jsx
│       ├── Clients.jsx
│       ├── Schedule.jsx
│       ├── Sessions.jsx
│       ├── Modal.jsx
│       └── TokenSetup.jsx
└── docs/               # Versioned instructions, changelogs, guides
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
- **iPhone safe areas**: Bottom elements need `env(safe-area-inset-bottom)`. Nav bar is z-index 100, modals must be 200+. Modal action buttons go in `modal-footer` (sticky), never in scrollable body. iOS keyboard shrinks `visualViewport` — modals handle this via resize listener.

## How to Run (Development)
```bash
npm install
npm run dev
```

## How to Build, Verify, and Deploy
Every code change must go through this full pipeline — **never skip steps**:
```bash
# 1. Build
npm run build

# 2. Verify the bundle isn't corrupted (catches blank-page bugs)
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js

# 3. Bump version in App.jsx header (e.g. v1.4 → v1.5), rebuild if changed

# 4. Commit and push source to master
git add <files> && git commit -m "message" && git push origin master

# 5. Deploy built files to gh-pages (THIS IS WHAT MAKES IT LIVE)
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
git add index.html sw.js && git commit -m "Deploy vX.Y: description" && git push origin gh-pages
git checkout master

# 6. Tell Pierre the version number so he can verify on his phone
```

**Critical notes:**
- Pushing to `master` alone does NOT deploy. The live site serves from `gh-pages`.
- The `fixForFileProtocol` plugin in vite.config.js uses a function replacement (`() =>`). Never change this to a string replacement — `$&` in React's minified code will corrupt the bundle.
- The `vite-plugin-singlefile` plugin inlines all JS and CSS into one HTML file.
- Google Fonts (DM Sans) still loads from the internet — device needs connectivity.
