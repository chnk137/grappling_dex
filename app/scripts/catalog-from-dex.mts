// Regenerates src/data/catalog.json from the web dex (../grappling-dex.html), so the
// app and the web dex share one list of positions and moves. Run: npm run catalog
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync(new URL('../../grappling-dex.html', import.meta.url), 'utf8');
const start = html.indexOf('const HUBS = [');
const end = html.indexOf('const entryNo');
if (start < 0 || end < 0) throw new Error('Could not find the catalog in grappling-dex.html');
const d3 = new Proxy({}, { get: () => null }); // TYPES uses d3 symbols; not needed here
const src = html.slice(html.indexOf('const TIERS'), end);
const { HUBS, HUB_LINKS, TECHS, CHAINS, TIERS } = new Function('d3', `${src}; return { HUBS, HUB_LINKS, TECHS, CHAINS, TIERS };`)(d3);

// Sanity checks: ids are unique across positions and moves, and every reference exists.
const ids = new Set<string>();
for (const n of [...HUBS, ...TECHS]) { if (ids.has(n.id)) throw new Error(`Duplicate id: ${n.id}`); ids.add(n.id); }
const hubIds = new Set(HUBS.map((h: { id: string }) => h.id));
for (const h of HUBS) if (!(h.tier in TIERS)) throw new Error(`Unknown tier ${h.tier} on ${h.id}`);
for (const [a, b] of HUB_LINKS) if (!hubIds.has(a) || !hubIds.has(b)) throw new Error(`Bad link ${a}-${b}`);
for (const t of TECHS) {
  for (const f of t.from) if (!hubIds.has(f)) throw new Error(`${t.id} starts from unknown position ${f}`);
  if (t.to && !hubIds.has(t.to)) throw new Error(`${t.id} leads to unknown position ${t.to}`);
}
for (const c of CHAINS) for (const id of c) if (!TECHS.some((t: { id: string }) => t.id === id)) throw new Error(`Combo names unknown move ${id}`);

const catalog = {
  version: 1,
  positions: HUBS.map(({ id, name, tier, x, y }: Record<string, unknown>) => ({ id, name, tier, x, y })),
  positionLinks: HUB_LINKS,
  techniques: TECHS.map(({ id, name, type, from, to, note, gi }: Record<string, unknown>) => ({ id, name, type, from, to, note, gi })),
  chains: CHAINS,
};
writeFileSync(new URL('../src/data/catalog.json', import.meta.url), JSON.stringify(catalog, null, 1) + '\n');
console.log(`catalog.json: ${catalog.positions.length} positions, ${catalog.techniques.length} moves, ${catalog.positionLinks.length} links, ${catalog.chains.length} combos`);
