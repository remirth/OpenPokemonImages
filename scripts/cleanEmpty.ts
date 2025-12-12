import fs from 'node:fs';
import { iterate } from './iterate';

async function deleteIfEmpty(p: string) {
  const stat = await fs.promises.stat(p);
  if (!stat.size) {
    console.log('Cleaning dead file:', p);
    await fs.promises.rm(p);
  }
}
const tasks: Array<Promise<void>> = [];
iterate((p) => {
  tasks.push(deleteIfEmpty(p));
});

await Promise.all(tasks);
