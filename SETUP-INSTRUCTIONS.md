# PTApp — Setup Instructions
### (Written for someone who has never done this before)

---

## STEP 1: Install Claude Code on your PC

You already have Warp terminal, so you're good there. Open it and paste this:

**On Windows (PowerShell):**
```
irm https://claude.ai/install.ps1 | iex
```

After it installs, type:
```
claude --version
```
If you see a version number, you're set. Claude Code will open a browser window to log you in — use your existing Claude Pro account.

---

## STEP 2: Download and unzip the project

I'm giving you a ZIP file. Here's what to do:

1. Download the `ptapp-project.zip` file
2. Unzip it somewhere on your PC (right-click → Extract All)
3. You'll get a folder called `ptapp-project`

---

## STEP 3: Open the project in Claude Code

In Warp, navigate to the folder:
```
cd path/to/ptapp-project
```
(Replace `path/to/` with wherever you unzipped it — for example `cd ~/Downloads/ptapp-project`)

Then start Claude Code:
```
claude
```

Claude Code will read the CLAUDE.md file and understand the whole project.

---

## STEP 4: Let Claude Code install and run it

Once Claude Code is open, just type:

```
Install the dependencies and start the dev server
```

Claude Code will run `npm install` followed by `npm run dev` for you. After a moment you'll see something like:

```
Local: http://localhost:3000
```

Open that link in your browser — the app is running!

---

## STEP 5: Access from your phone

While the dev server is running on your PC, you can open it on your phone too **if both devices are on the same WiFi**:

1. Find your PC's local IP (Claude Code can help — just ask "what's my local IP?")
2. On your phone browser, go to `http://YOUR_PC_IP:3000`
3. On iPhone: tap Share → "Add to Home Screen" to make it look like an app
4. On Android: tap the 3-dot menu → "Add to Home screen"

---

## STEP 6: Deploy online (so it works anywhere, anytime)

To make the app always available — even when your PC is off — ask Claude Code:

```
Build this project and help me deploy it to Netlify
```

Claude Code will walk you through creating a free Netlify account and deploying. You'll get a URL like `https://ptapp-xyz.netlify.app` that works on any phone, anywhere.

---

## How to make changes later

Anytime you want to add features or change something, just:

1. Open Warp
2. `cd` to the project folder
3. Run `claude`
4. Tell Claude Code what you want in plain English, like:
   - "Add a field for session price to track payments"
   - "Change the WhatsApp message template to include the gym address"
   - "Add an option to export all sessions to Excel"
   - "Make the app work in Arabic too"

Claude Code will make the changes for you.

---

## What each file does (in case you're curious)

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Tells Claude Code about the project |
| `package.json` | Lists what the project needs to run |
| `index.html` | The web page shell |
| `src/App.jsx` | Main app with the bottom tabs |
| `src/utils.js` | Helper code (storage, WhatsApp messages, etc.) |
| `src/styles.css` | How everything looks |
| `src/components/Dashboard.jsx` | Home screen with stats |
| `src/components/Clients.jsx` | Add/edit/delete clients |
| `src/components/Schedule.jsx` | Book sessions + calendar |
| `src/components/Sessions.jsx` | History of all sessions |
| `src/components/Modal.jsx` | The popup forms |

---

## Quick reference — useful commands to ask Claude Code

- "Run the app" → starts the dev server
- "Stop the server" → stops it
- "Build for production" → creates optimized files for deployment
- "Show me the project structure" → lists all files
- "Add [feature]" → describe any feature and Claude Code builds it
