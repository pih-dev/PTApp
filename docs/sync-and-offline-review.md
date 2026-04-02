# Sync & Offline Architecture Review

Created: 2026-04-02 — To revisit before making changes to sync or service worker.

---

## 1. Current GitHub Sync (src/sync.js + src/App.jsx)

### How it works
- Token stored in localStorage (`ptapp-sync-token`)
- Remote repo: `makdissi-dev/ptapp-data` → `data.json`
- **On app load**: fetches remote data, replaces all local data with it (remote wins)
- **On every state change**: saves to localStorage first, then pushes to GitHub
- Uses SHA tracking for GitHub API's required `sha` parameter on updates
- 409 conflict → refetch SHA, retry push once

### What works well
- localStorage save is immediate and reliable offline
- Remote sync is fire-and-forget (doesn't block the UI)
- Data versioning framework exists (migrateData in utils.js), ready for schema changes

### Risks & gaps
| Issue | Impact | Severity |
|-------|--------|----------|
| **Silent failures** — all sync errors caught with `.catch(() => {})` | User has no idea sync failed; thinks data is backed up when it's not | High |
| **Token expiration not surfaced** — throws 'TOKEN_EXPIRED' but never displayed | Sync silently stops working until user reconnects | High |
| **No conflict merging** — last-write-wins only | If PT and Pierre edit simultaneously, one person's changes are lost | Medium |
| **Rapid state changes** — every tap triggers a push | Multiple in-flight API calls; race conditions with SHA tracking | Medium |
| **Remote always wins on load** — REPLACE_ALL with remote data | If remote is stale/corrupted, local (possibly newer) data is overwritten | Medium |
| **No sync status indicator** — user can't see if data is synced | No way to know if a push succeeded or failed | Medium |
| **GitHub token in plain localStorage** — no encryption | Low risk for this use case but worth noting | Low |

### What a debounced auto-sync would need
- Debounce pushes (e.g., 30s after last change) instead of on every state change
- Dirty flag to skip sync if nothing changed
- Retry queue for failed pushes (with exponential backoff)
- Sync status indicator (synced / syncing / failed)
- Conflict resolution: compare timestamps or merge instead of last-write-wins
- Handle TOKEN_EXPIRED visibly (prompt to reconnect)

---

## 2. Service Worker (public/sw.js)

### How it works
- Registered in main.jsx on app load
- **HTML (navigation requests)**: Network-first — tries to fetch fresh, falls back to cache
- **Fonts**: Network-first — caches Google Fonts responses for offline use
- **Install**: Caches index.html immediately, `skipWaiting()` activates instantly
- **Activate**: Deletes old caches, `clients.claim()` takes control of all tabs

### What works well
- Network-first means users get the latest version when online
- Falls back to cached version when offline — app loads without internet
- Fonts are cached after first load
- Aggressive activation ensures updates take effect quickly

### Risks & gaps
| Issue | Impact | Severity |
|-------|--------|----------|
| **CACHE_NAME never changes** — hardcoded as `'ptapp-v1'` | Cache is never invalidated by new deploys; relies on network-first to serve fresh content. If network-first fails mid-update, stale HTML could persist | High |
| **No update notification** — user doesn't know a new version is available | After SW caches new version, user stays on old until next navigation | Medium |
| **skipWaiting + clients.claim** — immediate takeover | Could interrupt user mid-action if new SW activates during use | Medium |
| **Font caching not guaranteed** — only cached if loaded successfully once | First offline visit after first ever load may not have fonts | Low |
| **Version mismatch risk** — old cached HTML + new data format from GitHub | If a data migration is added, cached old code won't have the migration | Medium |
| **No cache size management** — fonts accumulate in cache | Over time, multiple font versions could fill cache (minor) | Low |

### What would make the SW safer
- Include a version hash in CACHE_NAME (e.g., from build time or git commit)
- Add a "new version available" prompt instead of silent update
- Consider removing skipWaiting — let user control when to update
- Add the app version in the cached HTML so version mismatches can be detected
- Alternatively: remove SW entirely and rely on browser HTTP caching + Add to Home Screen

### Rollback plan
If the SW causes issues:
1. Deploy a "kill switch" sw.js that unregisters itself:
```javascript
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
  self.registration.unregister();
});
```
2. Deploy this to gh-pages as sw.js — it will replace the old SW, clear caches, and unregister itself.

---

## 3. localStorage (src/utils.js)

### How it works
- Main data key: `ptapp-data` — JSON with `{ _dataVersion, clients, sessions }`
- Country code preference: `ptapp-country-code`
- Sync token: `ptapp-sync-token`
- Saved on every state change (immediate, synchronous)
- Loaded on app start, passed through `migrateData()` for schema upgrades

### What works well
- Immediate, reliable, works offline
- Migration framework ready (DATA_VERSION + migrateData chain)
- Error handling on load/save (try/catch with console.error)

### Risks
| Issue | Impact | Severity |
|-------|--------|----------|
| **Browser cache clear = data loss** — if PT clears Safari data, everything gone | Mitigated by GitHub sync, but user may not realize | High |
| **Safari storage eviction** — iOS can evict localStorage under storage pressure | Rare but possible; PWA/homescreen apps get more storage | Medium |
| **No export/import UI** — no manual backup option | User can't save a safety copy | Medium |
| **Size limit (~5-10MB)** — could be hit with many sessions over years | Unlikely soon but no warning mechanism | Low |
| **No data integrity checks** — no checksum or validation on load | Corrupted JSON = app crashes or empty state | Low |

---

## 4. Data Flow Summary

```
User action
  → dispatch(action)
    → useReducer updates state
      → useEffect [state]:
          1. saveData(state) → localStorage (immediate, always works)
          2. pushRemoteData(token, state) → GitHub API (async, can fail silently)

App load
  → loadData() from localStorage (instant)
  → fetchRemoteData(token) from GitHub (async)
    → if remote exists: REPLACE_ALL → overwrites local with remote
    → if no remote: push local to remote
```

---

## 5. Recommendations (prioritized)

### Do now (low risk, high value)
1. **Add sync status indicator** — small icon showing synced/syncing/failed
2. **Surface TOKEN_EXPIRED** — show a reconnect prompt instead of silent failure
3. **Debounce sync pushes** — 30s after last change, not on every tap

### Do before Stage 2
4. **Version the SW cache** — include build hash in CACHE_NAME
5. **Add "update available" prompt** — don't force-update mid-session
6. **Add export/import** — manual JSON download as emergency backup
7. **Add conflict detection** — at minimum, warn when remote is newer than expected

### Consider for Stage 2
8. **Merge strategy** — instead of last-write-wins, merge by comparing timestamps per record
9. **IndexedDB** — more storage, less eviction risk than localStorage
10. **Proper backend** — if multi-device sync becomes critical

---

## 6. Decision log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-02 | Service worker deployed (network-first) | Offline support for Beirut connectivity |
| 2026-04-02 | Font loading made non-blocking | App renders immediately without internet |
| 2026-04-02 | Review doc created, no sync changes yet | Need to assess risks before modifying sync behavior |
| 2026-04-02 | SW rollback plan documented | Safety net if caching causes issues |
