# STATUS.md — show-tracker-webapp

**Project:** Offline family watch-list web app ("Show Tracker")
**Owner:** Asdale Dynamics, LLC — Indiana, formed Oct 2026 (Dylan Asdale)
**Status:** Complete, tested, committed (`main`, single commit). Not pushed, not published.

## What was built

`index.html` — a zero-dependency, single-file offline web app (HTML/CSS/JS in one
file, runs straight from `file://`):

- **Show cards** with platform tags (Netflix, Prime Video, broadcast, … via a
  free-text field with sensible suggestions) and mood tags.
- **Season/episode "where you stopped"** with `+ Episode` / `− Episode` buttons;
  rolls into the next season when episodes-per-season is known, and shows an
  optional progress bar.
- **Want-to-watch queue** with up/down reordering and a "Start watching" action.
- **"Next episode someday" notes** on every card (editable via the Edit form).
- **Ended vs. ongoing tags** on every card (chip: green "Ongoing" / neutral "Ended").
- **Tonight-pick shuffle**: pick mood chips (cozy, funny, thrilling, dark, light,
  drama, sci-fi, reality, docs, romance), shuffle only among watching/queued shows
  matching those moods, and it avoids the last five picks so it doesn't repeat
  itself night after night. Picking a queued show offers "Open episode
  book-keeping", which starts tracking it.
- **Wrap-up log**: "Wrap up (finished)" moves a show out of the watching list into
  a dated log (title, platform, finished at S/E), with a running count.
- **Persistence**: `localStorage` key `showTracker.v1`. Every change saves
  immediately. Corrupt or foreign storage content falls back to a clean default
  state (covered by tests).
- **Backup**: header buttons for JSON export (downloaded file) and import
  (replace-all), plus a double-confirmed "Clear all data".
- **No accounts, no network calls, no scraping.** All user data stays on-device.

Design notes: warm cream/terracotta palette, system fonts, responsive layout,
keyboard-focusable controls, all dynamic content HTML-escaped before rendering.

`tests/test.mjs` — 35 dependency-free Node tests that load the pure logic out of
`index.html` (between `APP_LOGIC_START`/`APP_LOGIC_END` markers) into an isolated
VM with a localStorage stub. Covers:

- progress: label formatting, advancing, season rollover, retreat (including
  default-12 fallback and can't-go-past-the-beginning), progress percent + clamping
- shuffle: candidate filtering by mood, deterministic seeded picks, recent-pick
  avoidance, fallback behavior
- queue: move up/down with edge no-ops, full-array swap semantics
- wrap-up log ordering, markFinished, mood toggling
- persistence: save/load round-trip, corrupt JSON recovery, show validation/normalization

`README.md` — features, run instructions, data-privacy notes, test instructions;
credits Asdale Dynamics, LLC.
`LICENSE` — MIT, copyright line exactly: `Copyright (c) 2026 Asdale Dynamics, LLC`.

## How to run

- **App:** double-click `index.html`. No server, no build, no dependencies.
- **Tests:** `node tests/test.mjs` (needs only Node; no packages installed).

## Verification results

- `node tests/test.mjs` → **35 passed, 0 failed**.
- Script smoke check (full `<script>` block compiles; every `getElementById`
  target, panel id, and `data-act` handler exists and is wired) → **PASS**.
- Logic bugs found and fixed during verification:
  - `retreatEpisode` originally allowed stepping from S3 E1 to S3 E0 instead of
    the previous season's last episode; fixed to roll back across seasons and
    stop at absolute zero.
  - Test-side `deepStrictEqual` false-negative on arrays created inside the VM
    realm; fixed by re-materializing the array in the test realm.
  - Removed a leftover unreachable `data-act` branch and a typo in an empty state.

## Known gaps / future ideas

- No per-card inline editing of moods/platform — editing goes through the
  shared form (prefilled), which works but is one extra click.
- The shuffle avoids the last 5 picks globally; there's no per-person or
  per-weeknight rotation (family-member tracking could be a future feature).
- No multi-device sync by design (local-first); backups are manual JSON
  export/import.
- Browser-based end-to-end test (e.g., clicking a card in a real DOM) isn't
  automated here because the project constraint is zero dependencies; the DOM
  wiring is covered by the static smoke check plus manual verification.
- Shows list has no search/sort beyond queue order once lists get large.

## Repo

- `main` branch, one commit: "Add show-tracker-webapp: offline family watch-list
  with tonight-pick shuffle" (plain message, no trailers).
- No remote configured, nothing pushed, nothing published. No secrets, API
  keys, or personal data anywhere in the files.
