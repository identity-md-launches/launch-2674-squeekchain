import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Select the upstream Unicode shards used by this page, rather than shipping a full CJK font.
const packageRoot = resolve(process.argv[2] || 'node_modules/@fontsource-variable/noto-sans-sc');
const css = await readFile(`${packageRoot}/wght.css`, 'utf8');
const content = await readFile('index.html', 'utf8') + await readFile('src/main.ts', 'utf8');
const codepoints = [...new Set([...content].map(char => char.codePointAt(0)).filter(point => point > 0x2e80))];
const selected = [];
await mkdir('src/assets/cjk', { recursive: true });
for (const match of css.matchAll(/@font-face\s*\{.*?\}/gs)) {
  const block = match[0];
  const ranges = block.match(/unicode-range:\s*(.*?);/)[1].split(',');
  const needed = ranges.some(range => {
    const [first, last] = range.trim().slice(2).split('-').map(value => parseInt(value, 16));
    return codepoints.some(point => point >= first && point <= (last ?? first));
  });
  if (!needed) continue;
  const source = block.match(/url\(\.\/(.*?)\)/)[1];
  const name = source.split('/').at(-1);
  await copyFile(`${packageRoot}/${source}`, `src/assets/cjk/${name}`);
  selected.push(block.replace(`./${source}`, `./cjk/${name}`));
}
await writeFile('src/assets/noto-sans-sc.css', `/* Noto Sans SC, SIL OFL 1.1. Selected unmodified upstream Unicode shards. */\n${selected.join('\n\n')}\n`);
await copyFile(`${packageRoot}/LICENSE`, 'src/assets/NotoSansSC-LICENSE.txt');
const metadata = JSON.parse(await readFile(`${packageRoot}/package.json`, 'utf8'));
await writeFile('src/assets/FONTS.md', `# Local fonts\n\nNunito: @fontsource-variable/nunito 5.2.7, Latin variable WOFF2, weights 200–1000. License: Nunito-LICENSE.txt.\n\nNoto Sans SC: ${metadata.name} ${metadata.version}, ${selected.length} original Unicode shards selected for the current HTML and TypeScript copy; variable WOFF2, weights 100–900. License: NotoSansSC-LICENSE.txt. No font outlines were modified.\n\nAfter changing Chinese copy, refresh the subset with scripts/prepare-fonts.mjs; the system sans-serif stack handles any character absent from the bundled ranges.\n`);
console.log(`Prepared ${selected.length} local Noto Sans SC Unicode shards`);
