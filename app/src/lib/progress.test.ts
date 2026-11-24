/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addItem, BACKUP_FORMAT, describeItem, liveRecord, lastPosition, movesIn, nextStep, parseBackup, posStage, removeMove, stageOf, stats, toBackup, type Progress, type Session } from './progress.ts';

const session = (date: string, items: Session['items'] = {}): Session => ({ id: date, date, items });
const prog = (sessions: Session[], base: Progress['base'] = {}): Progress => ({ sessions, base });

test('an unlogged move is Unseen', () => {
  assert.equal(stageOf(prog([]), 'armbar'), 0);
});

test('one log of any kind makes a move Seen', () => {
  assert.equal(stageOf(prog([session('2026-11-01', { armbar: { kind: 'seen', hits: 0 } })]), 'armbar'), 1);
});

test('Seen more than once is still Seen', () => {
  const p = prog([session('2026-11-01', { armbar: { kind: 'seen', hits: 0 } }), session('2026-11-02', { armbar: { kind: 'seen', hits: 0 } })]);
  assert.equal(stageOf(p, 'armbar'), 1);
});

test('drilling once reaches Drilled', () => {
  assert.equal(stageOf(prog([session('2026-11-01', { armbar: { kind: 'drilled', hits: 0 } })]), 'armbar'), 2);
});

test('a single live hit reaches Hit, even without drilling first', () => {
  assert.equal(stageOf(prog([session('2026-11-01', { armbar: { kind: 'hit', hits: 1 } })]), 'armbar'), 3);
});

test('Mastered needs live hits on 5 different days; hit counts within a day do not matter', () => {
  const day = (d: string, hits = 1) => session(d, { armbar: { kind: 'hit', hits } });
  const crammed = prog([day('2026-11-01', 9), day('2026-11-02', 9)]);
  assert.equal(stageOf(crammed, 'armbar'), 3, 'many hits on two days is not mastery');
  const four = ['01', '03', '05', '07'].map(d => day(`2026-11-${d}`));
  assert.equal(stageOf(prog(four), 'armbar'), 3);
  assert.equal(stageOf(prog([...four, day('2026-11-09')]), 'armbar'), 4);
});

test('a starting stage is a floor, and logs can raise it', () => {
  assert.equal(stageOf(prog([], { armbar: 2 }), 'armbar'), 2);
  assert.equal(stageOf(prog([session('2026-11-01', { armbar: { kind: 'hit', hits: 1 } })], { armbar: 2 }), 'armbar'), 3);
});

test('practice never downgrades a move within a session; each landed tap counts', () => {
  let s = session('2026-11-01');
  s = addItem(s, 'armbar', 'landed');
  s = addItem(s, 'armbar', 'drilled');
  s = addItem(s, 'armbar', 'landed');
  assert.deepEqual(s.items.armbar, { kind: 'hit', hits: 2 });
  s = addItem(s, 'triangle', 'seen');
  s = addItem(s, 'triangle', 'drilled');
  assert.deepEqual(s.items.triangle, { kind: 'drilled', hits: 0 });
});

test('next step text says what is left', () => {
  const seen = prog([session('2026-11-01', { armbar: { kind: 'seen', hits: 0 } })]);
  assert.equal(nextStep(seen, 'armbar'), 'Drill it once to reach Drilled.');
  const hit = prog([session('2026-11-01', { armbar: { kind: 'hit', hits: 2 } }), session('2026-11-02', { armbar: { kind: 'hit', hits: 1 } })]);
  assert.equal(nextStep(hit, 'armbar'), 'Hit it live on 3 more days to reach Mastered.');
});

test('a hit from closed guard counts for closed guard only', () => {
  const p = prog([session('2026-11-01', { 'triangle@closed': { kind: 'hit', hits: 1 }, 'armbar@closed': { kind: 'hit', hits: 1 } })]);
  assert.equal(stageOf(p, 'triangle'), 3, 'the move itself is Hit');
  assert.equal(posStage(p, 'triangle', 'closed'), 3);
  assert.equal(posStage(p, 'triangle', 'smount'), 0, 'S-mount gets nothing');
});

test('the move stage combines positions, and a day counts once', () => {
  const p = prog([
    session('2026-11-01', { 'armbar@closed': { kind: 'hit', hits: 1 }, 'armbar@mount': { kind: 'hit', hits: 1 } }),
    session('2026-11-02', { 'armbar@mount': { kind: 'drilled', hits: 0 } }),
  ]);
  assert.equal(stats(p, 'armbar').hitDays, 1);
  assert.equal(stats(p, 'armbar').sessions, 2);
  assert.equal(posStage(p, 'armbar', 'mount'), 3);
  const days = ['03', '04', '05', '06'].map(d => session(`2026-11-${d}`, { 'armbar@mount': { kind: 'hit', hits: 1 } }));
  assert.equal(stageOf(prog([...p.sessions, ...days]), 'armbar'), 4, 'five days, from any mix of positions');
});

test('old entries without a position, and starting stages, count for every position', () => {
  const old = prog([session('2026-11-01', { triangle: { kind: 'hit', hits: 1 } })]);
  assert.equal(posStage(old, 'triangle', 'smount'), 3);
  assert.equal(posStage(prog([], { kimura: 3 }), 'kimura', 'side'), 3);
});

test('entries are kept per position and removed per move', () => {
  let s = session('2026-11-01');
  s = addItem(s, 'armbar', 'landed', 'closed');
  s = addItem(s, 'armbar', 'drilled', 'mount');
  s = addItem(s, 'armbar', 'seen', 'closed');
  s = addItem(s, 'kimura', 'drilled', 'side');
  assert.deepEqual(Object.keys(s.items), ['armbar@closed', 'armbar@mount', 'kimura@side']);
  assert.equal(s.items['armbar@closed'].kind, 'hit');
  assert.deepEqual(movesIn(s), ['armbar', 'kimura']);
  assert.deepEqual(Object.keys(removeMove(s, 'armbar').items), ['kimura@side']);
});

test('lastPosition finds the most recent position used', () => {
  const p = prog([
    session('2026-11-01', { 'armbar@closed': { kind: 'hit', hits: 1 } }),
    session('2026-11-02', { 'armbar@mount': { kind: 'drilled', hits: 0 }, kimura: { kind: 'seen', hits: 0 } }),
  ]);
  assert.equal(lastPosition(p, 'armbar'), 'mount');
  assert.equal(lastPosition(p, 'kimura'), null);
});

test('a backup round-trips', () => {
  const p: Progress = {
    sessions: [{ id: 'b', date: '2026-11-02', items: { armbar: { kind: 'hit', hits: 2 } } }, { id: 'a', date: '2026-11-01', items: { kimura: { kind: 'drilled', hits: 0 } } }],
    base: { triangle: 3 },
  };
  const back = parseBackup(toBackup(p));
  assert.deepEqual(back.sessions.map(s => s.id), ['a', 'b']);
  assert.deepEqual(back.sessions[1].items.armbar, { kind: 'hit', hits: 2 });
  assert.deepEqual(back.base, { triangle: 3 });
});

test('parseBackup rejects other files and drops bad entries', () => {
  assert.throws(() => parseBackup('not json'), /isn't a Grappling Dex backup/);
  assert.throws(() => parseBackup('{"sessions":[]}'), /isn't a Grappling Dex backup/);
  assert.throws(() => parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 9, sessions: [] })), /newer version/);
  const p = parseBackup(JSON.stringify({
    format: BACKUP_FORMAT, version: 1,
    sessions: [
      { id: 'ok', date: '2026-11-01', items: { armbar: { kind: 'hit', hits: 0 }, bad: { kind: 'nope' } } },
      { id: 'ok', date: '2026-11-02', items: { kimura: { kind: 'seen' } } },
      { id: 'nodate', items: { kimura: { kind: 'seen' } } },
    ],
    base: { triangle: 7, kimura: 2 },
  }));
  assert.equal(p.sessions.length, 1);
  assert.deepEqual(p.sessions[0].items, { armbar: { kind: 'hit', hits: 1 } });
  assert.deepEqual(p.base, { kimura: 2 });
});

test('missed, stopped and caught build the live record but never the stage', () => {
  let s = session('2026-11-01');
  s = addItem(s, 'triangle', 'caught', 'closed');
  s = addItem(s, 'triangle', 'caught', 'closed');
  s = addItem(s, 'triangle', 'stopped', 'closed');
  s = addItem(s, 'armbar', 'missed', 'mount');
  const p = prog([s]);
  assert.equal(stageOf(p, 'triangle'), 0, 'getting caught does not make it Seen');
  assert.equal(stageOf(p, 'armbar'), 0, 'a miss does not either');
  assert.deepEqual(s.items['triangle@closed'], { kind: null, hits: 0, stopped: 1, caught: 2 });
  assert.equal(describeItem(s.items['triangle@closed']), 'Stopped · Caught ×2');
  s = addItem(s, 'triangle', 'drilled', 'closed');
  assert.equal(s.items['triangle@closed'].kind, 'drilled', 'practice still upgrades a defense-only entry');
  assert.equal(s.items['triangle@closed'].caught, 2);
});

test('liveRecord adds up by move and position; old hits count as one landed', () => {
  const p = prog([
    session('2026-11-01', { 'armbar@closed': { kind: 'hit', hits: 1, missed: 2 }, 'armbar@mount': { kind: null, hits: 0, caught: 1 } }),
    session('2026-11-02', { armbar: { kind: 'hit', hits: 1 } }),
  ]);
  assert.deepEqual(liveRecord(p, 'armbar'), { landed: 2, missed: 2, stopped: 0, caught: 1 });
  assert.deepEqual(liveRecord(p, 'armbar', 'mount'), { landed: 1, missed: 0, stopped: 0, caught: 1 });
});

test('a backup keeps the live record', () => {
  const p: Progress = { sessions: [{ id: 'a', date: '2026-11-01', items: { 'triangle@closed': { kind: null, hits: 0, caught: 3 }, 'armbar@closed': { kind: 'hit', hits: 2, missed: 1 } } }], base: {} };
  assert.deepEqual(parseBackup(toBackup(p)).sessions[0].items, p.sessions[0].items);
});
