// Writes docs/privacy.html and docs/privacy.md (the hosted copies for the store listings)
// from src/data/privacy.ts. The .md is for pasting into a public GitHub Gist.
// Run with: npm run privacy-page
import { writeFileSync } from 'node:fs';
import { PRIVACY, PRIVACY_CONTACT, PRIVACY_UPDATED } from '../src/data/privacy.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Grappling Dex privacy policy</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0e1320; color: #8d97b0; font: 16px/1.6 -apple-system, system-ui, sans-serif; }
  main { max-width: 640px; margin: 0 auto; padding: 40px 16px 64px; }
  h1 { color: #e7eaf3; font-size: 26px; margin: 0 0 4px; }
  h2 { color: #e7eaf3; font-size: 17px; margin: 28px 0 4px; }
  p { margin: 0; }
  a { color: #d9b46c; }
  .updated { font-size: 14px; }
</style>
</head>
<body>
<main>
<h1>Grappling Dex privacy policy</h1>
<p class="updated">Last updated ${PRIVACY_UPDATED}</p>
${PRIVACY.map(s => `<h2>${esc(s.heading)}</h2>\n<p>${esc(s.body)}</p>`).join('\n')}
<h2>Contact</h2>
<p>Questions go to <a href="${PRIVACY_CONTACT}">the project's GitHub page</a>.</p>
</main>
</body>
</html>
`;
writeFileSync(new URL('../../docs/privacy.html', import.meta.url), html);
const md = `# Grappling Dex privacy policy

Last updated ${PRIVACY_UPDATED}

${PRIVACY.map(s => `## ${s.heading}\n\n${s.body}`).join('\n\n')}

## Contact

Questions go to [the project's GitHub page](${PRIVACY_CONTACT}).
`;
writeFileSync(new URL('../../docs/privacy.md', import.meta.url), md);
console.log('Wrote docs/privacy.html and docs/privacy.md');
