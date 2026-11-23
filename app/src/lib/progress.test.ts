/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addItem, BACKUP_FORMAT, nextStep, parseBackup, stageOf, toBackup, type Progress, type Session } from './progress.ts';

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

test('logging never downgrades a move within a session', () => {
  let s = session('2026-11-01');
  s = addItem(s, 'armbar', 'hit');
  s = addItem(s, 'armbar', 'drilled');
  s = addItem(s, 'armbar', 'hit');
  assert.deepEqual(s.items.armbar, { kind: 'hit', hits: 1 });
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
