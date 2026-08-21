@echo off
REM ---------------------------------------------------------------------------
REM Phase-2 soak run. Registered as the Windows scheduled task "SpotSet soak
REM gate" so the seven-day count does not depend on a Claude Code session
REM existing that day -- Pierre clears context several times a day, and a check
REM that only runs when someone remembers is not a soak.
REM
REM 🔴 MIRROR FIRST, THEN GATE, AND THE ORDER IS THE WHOLE POINT.
REM    In Phase 2 the mirror runs off the commit stream, from this machine --
REM    never from the app, because pih-dev/PTApp is public and no credential
REM    that reaches live data may ship in a bundle (decision doc §4). So the
REM    gate is only meaningful if the mirror has already caught up: gating
REM    alone would go red the moment the PT edits anything, which is the PT
REM    working correctly, not a divergence.
REM
REM    --if-changed makes the mirror a cheap no-op when nothing moved, so this
REM    is safe to run often.
REM
REM Read the history back with:  node scripts/soak-status.mjs
REM Unregister with:  schtasks /Delete /TN "SpotSet soak gate" /F
REM ---------------------------------------------------------------------------
cd /d C:\projects\PTApp
set LOG=C:\projects\_archive\PTApp\soak-runs.txt
echo ---- %DATE% %TIME% ---- >> "%LOG%"
node scripts\mirror-to-supabase.mjs --email pierreghorra@gmail.com --if-changed >> "%LOG%" 2>&1
echo mirror exit=%ERRORLEVEL% >> "%LOG%"
node scripts\sanity\sanity-live-supabase-diff.mjs >> "%LOG%" 2>&1
echo gate exit=%ERRORLEVEL% >> "%LOG%"
