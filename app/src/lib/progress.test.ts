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

test('Drilled needs drilling in two separate sessions', () => {
  const one = prog([session('2026-11-01', { armbar: { kind: 'drilled', hits: 0 } })]);
  assert.equal(stageOf(one, 'armbar'), 1);
  const two = prog([...one.sessions, session('2026-11-03', { armbar: { kind: 'drilled', hits: 0 } })]);
  assert.equal(stageOf(two, 'armbar'), 2);
});

test('a single live hit reaches Hit, even without drilling first', () => {
  assert.equal(stageOf(prog([session('2026-11-01', { armbar: { kind: 'hit', hits: 1 } })]), 'armbar'), 3);
});

test('Mastered needs 5 hits across at least 3 sessions', () => {
  const crammed = prog([session('2026-11-01', { armbar: { kind: 'hit', hits: 6 } })]);
  assert.equal(stageOf(crammed, 'armbar'), 3, 'six hits in one session is not mastery');
  const spread = prog([
    session('2026-11-01', { armbar: { kind: 'hit', hits: 2 } }),
    session('2026-11-03', { armbar: { kind: 'hit', hits: 2 } }),
    session('2026-11-05', { armbar: { kind: 'hit', hits: 1 } }),
  ]);
  assert.equal(stageOf(spread, 'armbar'), 4);
});

test('a starting stage is a floor, and logs can raise it', () => {
  assert.equal(stageOf(prog([], { armbar: 2 }), 'armbar'), 2);
  assert.equal(stageOf(prog([session('2026-11-01', { armbar: { kind: 'hit', hits: 1 } })], { armbar: 2 }), 'armbar'), 3);
});

test('logging never downgrades a move within a session, and hits add up', () => {
  let s = session('2026-11-01');
  s = addItem(s, 'armbar', 'hit');
  s = addItem(s, 'armbar', 'drilled');
  assert.deepEqual(s.items.armbar, { kind: 'hit', hits: 1 });
  s = addItem(s, 'armbar', 'hit', 2);
  assert.deepEqual(s.items.armbar, { kind: 'hit', hits: 3 });
  s = addItem(s, 'triangle', 'seen');
  s = addItem(s, 'triangle', 'drilled');
  assert.deepEqual(s.items.triangle, { kind: 'drilled', hits: 0 });
});

test('next step text counts what is left', () => {
  const p = prog([session('2026-11-01', { armbar: { kind: 'drilled', hits: 0 } })]);
  assert.equal(nextStep(p, 'armbar'), 'Drill it in 1 more session to reach Drilled.');
  const hit = prog([session('2026-11-01', { armbar: { kind: 'hit', hits: 2 } })]);
  assert.equal(nextStep(hit, 'armbar'), 'For Mastered: 3 more live hits and hits in 2 more sessions.');
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
