# Show Tracker

A family watch-list that lives entirely in your browser. No accounts, no cloud, no
scraping other sites — just a single HTML file that remembers where you stopped,
what you want to watch someday, and what you actually finished.

This one is for **shows** (Netflix, Disney+, whatever you use). There's a sibling
app, *game-backlog-tracker-webapp*, for games — this is the TV-shaped one.

## What it does

- **Show cards** — each show has a platform tag (Netflix, Prime Video, broadcast…),
  your stopping point, mood tags, and a where-you-stopped note.
- **Season/episode memory** — "you stopped at S2 E4" with one-tap `+ Episode` /
  `− Episode` buttons that roll over seasons when you tell it how many episodes
  a season has, plus an optional progress bar.
- **Want-to-watch queue** — a real queue: move shows up and down, "someday" order
  intact, with a *Start watching* button when the mood strikes.
- **"Next episode someday" notes** — a note per show for the things future-you
  will forget ("we owe Sam an explanation — start at E3").
- **Ended vs. ongoing tags** — every card says whether the show has ended or
  could still chop up your week with a cliffhanger.
- **Tonight-pick shuffle** — pick your mood (cozy, funny, thrilling, dark…), hit
  shuffle, and it picks from shows that match. It avoids the shows it picked
  recently, so you don't get pitched the same thing three nights in a row.
- **Wrap-up log** — when you finish a show, "Wrap up (finished)" moves it out of
  the watching list into a log with the date and where it ended. A little shelf
  of shows actually finished.

## How to run it

1. Download or clone this folder.
2. Double-click `index.html` (or open it in any modern browser).
3. That's it. Runs straight from `file://`.

Optional: export a backup (JSON download) from the header, and re-import it in a
new browser or device. Useful when switching computers.

## Where your data lives

In your browser's `localStorage`, under the key `showTracker.v1`, on the device
you opened it on. Nothing is sent anywhere, no analytics, no accounts. Clearing
browser site data for this page erases the list (use "Clear all data" in-app, or
export a backup first).

## Tests

The progress and shuffle logic is plain, dependency-free JavaScript that the
tests load straight out of `index.html`:

```bash
node tests/test.mjs
```

35 assertions covering episode advancing/rolling over seasons, the progress bar
math, queue reordering, the mood-filtered tonight-pick shuffle (deterministic,
seeded random for testability), the wrap-up log, and localStorage corruption
recovery.

## Tech

Pure HTML/CSS/JavaScript. Zero dependencies, zero build step, one file.

## Credits & license

Built by **[Asdale Dynamics, LLC](https://dylanasdale.github.io)** — maker of
friendly, local-first tools and the book *The Massive AI Manual* (AI explained
like a friend would: plain English, step by step, never condescending).

Licensed under the MIT License. See [LICENSE](LICENSE).
