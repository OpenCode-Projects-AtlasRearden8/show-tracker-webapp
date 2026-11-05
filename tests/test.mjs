/*
 * Show Tracker — logic tests
 * Run:  node tests/test.mjs
 *
 * Loads the pure-logic block from index.html (between the APP_LOGIC markers)
 * into an isolated Node context (with a localStorage stub) and tests the
 * progress, queue, wrap-up, and shuffle logic. No dependencies.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(here, '..', 'index.html');
const html = readFileSync(htmlPath, 'utf8');

const m = html.match(/\/\* APP_LOGIC_START \*\/([\s\S]*?)\/\* APP_LOGIC_END \*\//);
assert.ok(m, 'index.html must contain the APP_LOGIC_START/END markers');

const moduleStub = { exports: {} };
const storage = new Map();
const localStorageStub = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => { storage.set(k, String(v)); },
  removeItem: (k) => { storage.delete(k); }
};
vm.runInNewContext(m[1], { module: moduleStub, localStorage: localStorageStub }, { filename: 'app-logic.js' });

const {
  progressLabel, advanceEpisode, retreatEpisode, progressPercent,
  toggleMood, markFinished, moveInQueue, pickTonight, tonightCandidates,
  wrapUpLog, loadState, saveState, defaultState, normalizeShow
} = moduleStub.exports;

/* minimal fake show factory */
function show(id, extra) {
  return Object.assign({ id, title: 'Show ' + id, status: 'watching', season: 1, episode: 0, moods: [] }, extra);
}

/* tiny harness */
let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  - ' + name); }
  catch (e) { failed++; console.error('  FAIL - ' + name + '\n        ' + (e && e.message)); }
}

console.log('Show Tracker logic tests\n');

/* ---------- progress: label ---------- */
test('progressLabel formats season and episode', () => {
  assert.equal(progressLabel({ season: 2, episode: 5 }), 'S2 E5');
});
test('progressLabel shows "not started" at episode 0', () => {
  assert.equal(progressLabel({ season: 1, episode: 0 }), 'not started');
});
test('progressLabel shows "not started" for missing fields', () => {
  assert.equal(progressLabel({}), 'not started');
});

/* ---------- progress: advance ---------- */
test('advance increments episode within a season', () => {
  const out = advanceEpisode(show('a', { season: 1, episode: 3 }));
  assert.equal(out.season, 1);
  assert.equal(out.episode, 4);
});
test('advance from not-started lands on S1 E1', () => {
  const out = advanceEpisode(show('a', { season: 1, episode: 0 }));
  assert.equal(out.season, 1);
  assert.equal(out.episode, 1);
});
test('advance rolls into next season when episode counts are known', () => {
  const out = advanceEpisode(show('a', { season: 2, episode: 10, episodesPerSeason: 10 }));
  assert.equal(out.season, 3);
  assert.equal(out.episode, 1);
});
test('advance works without a known episodes-per-season count', () => {
  const out = advanceEpisode(show('a', { season: 1, episode: 98 }));
  assert.equal(out.season, 1);
  assert.equal(out.episode, 99);
});
test('advance keeps other properties and returns a new object (no mutation)', () => {
  const s = show('a', { title: 'That One Show', episode: 2, moods: ['cozy'] });
  const out = advanceEpisode(s);
  assert.equal(out.title, 'That One Show');
  assert.deepEqual(out.moods, ['cozy']);
  assert.equal(s.episode, 2);
  assert.notEqual(out, s);
});
test('advancing a queued show moves it to watching', () => {
  const out = advanceEpisode(show('a', { status: 'want', episode: 0 }));
  assert.equal(out.status, 'watching');
});

/* ---------- progress: retreat ---------- */
test('retreat steps back one episode', () => {
  const out = retreatEpisode(show('a', { season: 1, episode: 5 }));
  assert.equal(out.episode, 4);
});
test('retreat at episode 1 with unknown length goes to previous season, default 12', () => {
  const out = retreatEpisode(show('a', { season: 3, episode: 1 }));
  assert.equal(out.season, 2);
  assert.equal(out.episode, 12);
});
test('retreat at episode 1 with known length uses that count', () => {
  const out = retreatEpisode(show('a', { season: 2, episode: 1, episodesPerSeason: 8 }));
  assert.equal(out.season, 1);
  assert.equal(out.episode, 8);
});
test('retreat cannot go before the very beginning', () => {
  const out = retreatEpisode(show('a', { season: 1, episode: 0 }));
  assert.equal(out.season, 1);
  assert.equal(out.episode, 0);
});

/* ---------- progress: percent ---------- */
test('progressPercent is 0 when episode count unknown', () => {
  assert.equal(progressPercent(show('a', { season: 1, episode: 5, episodesPerSeason: null })), 0);
});
test('progressPercent is 0 when not started', () => {
  assert.equal(progressPercent(show('a', { season: 1, episode: 0, episodesPerSeason: 10 })), 0);
});
test('progressPercent computes fraction of the season', () => {
  assert.equal(progressPercent(show('a', { season: 1, episode: 5, episodesPerSeason: 10 })), 50);
});
test('progressPercent clamps at 100', () => {
  assert.equal(progressPercent(show('a', { season: 1, episode: 12, episodesPerSeason: 10 })), 100);
});

/* ---------- moods & wrap-up ---------- */
test('toggleMood adds and removes', () => {
  let s = show('a');
  s = toggleMood(s, 'cozy');
  assert.deepEqual(s.moods, ['cozy']);
  s = toggleMood(s, 'cozy');
  assert.deepEqual(s.moods, []);
});
test('markFinished records status, date and stopping point', () => {
  const out = markFinished(show('a', { season: 2, episode: 4 }), '2026-11-05');
  assert.equal(out.status, 'finished');
  assert.equal(out.finishedAt, '2026-11-05');
  assert.equal(out.endedAt, 'S2 E4');
});

/* ---------- queue ---------- */
test('moveInQueue moves a queued show up', () => {
  const shows = [
    show('w1', { status: 'watching' }),
    show('q1', { status: 'want' }),
    show('w2', { status: 'watching' }),
    show('q2', { status: 'want' }),
    show('q3', { status: 'want' })
  ];
  // q1 is at full-array index 1, q2 at 3; moving q1 up with no queue item above is a no-op
  let out = moveInQueue(shows, 'q1', -1);
  assert.equal(out.filter(s => s.status === 'want').map(s => s.id).join(','), 'q1,q2,q3');
  // moving q1 down swaps around q2 -> q2, q1, q3 order in the full array
  out = moveInQueue(shows, 'q1', 1);
  const texts = out.filter(s => s.status === 'want').map(s => s.id).join(',');
  assert.equal(texts, 'q2,q1,q3');
});
test('moveInQueue is a no-op at the edges', () => {
  const shows = [show('q1', { status: 'want' }), show('q2', { status: 'want' })];
  assert.equal(moveInQueue(shows, 'q2', 1), shows);
  assert.equal(moveInQueue(shows, 'q1', -1), shows);
});
test('moveInQueue ignores shows that are not in the queue', () => {
  const shows = [show('w1', { status: 'watching' })];
  assert.equal(moveInQueue(shows, 'w1', 1), shows);
});

/* ---------- tonight-pick shuffle ---------- */
/* deterministic rand helpers */
const randFirst = () => 0;      // always picks index 0
const randLast = () => 0.999;   // always picks (near) last index
test('pickTonight returns null with no candidates', () => {
  assert.equal(pickTonight([], [], randFirst), null);
});
test('pickTonight only picks from the given candidates', () => {
  const pool = [show('a'), show('b')];
  const out = pickTonight(pool, [], randFirst);
  assert.ok(pool.includes(out));
  assert.equal(out.id, 'a', 'rand=0 picks the first candidate');
  const out2 = pickTonight(pool, [], randLast);
  assert.equal(out2.id, 'b', 'rand~1 picks the last candidate');
});
test('pickTonight avoids recently-picked shows when others exist', () => {
  const pool = [show('a'), show('b'), show('c'), show('d')];
  const out = pickTonight(pool, ['a'], randFirst, 3);
  assert.equal(out.id, 'b', 'a was just picked, so index 0 shifts to the next fresh one');
});
test('pickTonight falls back to a recent pick when everything is recent', () => {
  const pool = [show('a')];
  const out = pickTonight(pool, ['a'], randFirst, 3);
  assert.equal(out.id, 'a', 'still returns something rather than nothing');
});
test('pickTonight falls back when fresh pool would be empty', () => {
  const pool = [show('a'), show('b')];
  const out = pickTonight(pool, ['a', 'b'], randFirst, 3);
  assert.ok(out.id === 'a' || out.id === 'b');
});
test('tonightCandidates includes watching and queued, excludes finished', () => {
  const shows = [
    show('w', { status: 'watching' }),
    show('q', { status: 'want' }),
    show('f', { status: 'finished' })
  ];
  const all = tonightCandidates(shows, []);
  assert.deepEqual(all.map(s => s.id).sort(), ['q', 'w']);
});
test('tonightCandidates filters by the selected mood tags', () => {
  const shows = [
    show('cozy', { moods: ['cozy'] }),
    show('dark', { moods: ['dark'] })
  ];
  const out = tonightCandidates(shows, ['dark']);
  assert.deepEqual(out.map(s => s.id), ['dark']);
  assert.equal(tonightCandidates(shows, []).length, 2, 'no moods selected = everything matches');
});

/* ---------- wrap-up log ---------- */
test('wrapUpLog lists finished shows newest first without finishedAt missing', () => {
  const shows = [
    show('f1', { status: 'finished', finishedAt: '2026-10-01' }),
    show('f2', { status: 'finished', finishedAt: '2026-11-01' }),
    show('w', { status: 'watching', finishedAt: '' }),
    show('f3', { status: 'finished', finishedAt: '' }) // finished but no date recorded
  ];
  const log = wrapUpLog(shows);
  assert.deepEqual(log.map(s => s.id), ['f2', 'f1']);
});

/* ---------- persistence ---------- */
test('saveState + loadState round-trips through localStorage', () => {
  storage.clear();
  const state = defaultState();
  state.shows = [show('a'), show('b', { status: 'want', episode: 4 })];
  state.picks = ['b'];
  assert.equal(saveState(state), true);
  const loaded = loadState();
  assert.equal(loaded.shows.length, 2);
  assert.equal(loaded.shows[1].status, 'want');
  assert.equal(loaded.shows[1].episode, 4);
  assert.deepEqual([...loaded.picks], ['b']);
});
test('loadState returns defaults for corrupt JSON', () => {
  storage.clear();
  storage.set('showTracker.v1', '{not json');
  const state = loadState();
  assert.deepEqual(state, defaultState());
});
test('loadState returns defaults for non-object data', () => {
  storage.clear();
  storage.set('showTracker.v1', '"just a string"');
  assert.deepEqual(loadState(), defaultState());
});
test('normalizeShow sanitizes bad field values', () => {
  const out = normalizeShow({
    title: 42,
    season: -3,
    episode: 'oops',
    episodesPerSeason: -1,
    moods: ['nope', 'cozy'],
    ended: 'yes',
    status: 'bogus'
  });
  assert.equal(out.title, '');
  assert.equal(out.season, 1);
  assert.equal(out.episode, 0);
  assert.equal(out.episodesPerSeason, null);
  assert.deepEqual(out.moods, ['cozy']);
  assert.equal(out.ended, true);
  assert.equal(out.status, 'watching');
});
test('normalizeShow keeps a valid show intact', () => {
  const out = normalizeShow(show('abc', { season: 2, episode: 3, moods: ['dark'], ended: true, note: 'hi' }));
  assert.equal(out.id, 'abc');
  assert.equal(out.season, 2);
  assert.equal(out.episode, 3);
  assert.deepEqual(out.moods, ['dark']);
  assert.equal(out.ended, true);
  assert.equal(out.note, 'hi');
});

/* ---------- summary ---------- */
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
