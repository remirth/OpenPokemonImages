import fs from 'node:fs';
import path from 'node:path';
import * as R from 'remeda';

const imagesPath = path.join(process.cwd(), '.images');
const pokedexPath = path.join(imagesPath, 'pokedex');
export function iterate(cb: (path: string) => void) {
	R.pipe(
		fs.readdirSync(pokedexPath),
		R.map((p) => path.join(pokedexPath, p)),
		R.forEach(cb),
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
		R.forEach(cb),
	);
}

export function* walk(dir: string = imagesPath): Generator<string> {
	for (const name of fs.readdirSync(dir)) {
		const full = path.join(dir, name);
		const st = fs.statSync(full);
		if (st.isDirectory()) yield* walk(full);
		else if (st.isFile()) yield full;
	}
}
