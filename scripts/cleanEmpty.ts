import fs from 'node:fs';
import path from 'node:path';
import * as R from 'remeda';

const imagesPath = path.join(process.cwd(), '.images');
const pokedexPath = path.join(imagesPath, 'pokedex');
const paths: Array<string> = [];
R.pipe(
	fs.readdirSync(pokedexPath),
	R.map((p) => path.join(pokedexPath, p)),
	R.tap((ps) => paths.push(...ps)),
);

const cardPath = path.join(imagesPath, 'cards');
R.pipe(
	fs.readdirSync(cardPath),
	R.flatMap((p) => {
		const setPath = path.join(cardPath, p);
		return R.pipe(
			fs.readdirSync(setPath),
			R.map((c) => path.join(setPath, c)),
		);
	}),
	R.tap((ps) => paths.push(...ps)),
);

await Promise.all(
	paths.map(async (p) => {
		const stat = await fs.promises.stat(p);
		if (!stat.size) {
			console.log('Cleaning dead file:', p);
			await fs.promises.rm(p);
		}
	}),
);
