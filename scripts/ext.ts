import fs from 'node:fs/promises';
import path from 'node:path';
import { iterate } from './iterate.ts';

function ext(p: string) {
  return path.extname(p) || 'EMPTY';
}

async function process(p: string) {
  if (ext(p) === 'EMPTY') {
    const newPath = path.join(path.dirname(p), `${path.basename(p)}.webp.b64`);
    await fs.rename(p, newPath);
  }
}

const tasks: Array<Promise<void>> = [];
iterate((p) => tasks.push(process(p)));

await Promise.all(tasks);
