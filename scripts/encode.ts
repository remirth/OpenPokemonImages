import fs from 'node:fs/promises';
import path from 'node:path';
import {walk} from './iterate.ts';

const imagesPath = path.join(process.cwd(), '.images');
for (const image of walk(imagesPath)) {
	const name = path.basename(image);
	const encoded = encodeURIComponent(name);
	if (name !== encoded) {
		const dir = path.dirname(image);
		const full = path.join(dir, encoded);
		console.log(full);
		await fs.rename(image, full);
	}
}
