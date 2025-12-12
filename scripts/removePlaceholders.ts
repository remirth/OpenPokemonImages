import { walk } from './iterate';
import fs from 'node:fs/promises';

for (const image of walk()) {
  if (image.includes('_placeholder')) {
    await fs.rm(image);
    console.log('Removed', image);
  }
}
