import {createHash} from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {getPlaiceholder} from 'plaiceholder';
import * as R from 'remeda';
import sharp from 'sharp';
import {http} from './http';
import {lazyLoaded} from './lazy';
import type {CardFile} from './schemas';

const PATCHED_URLS: Record<string, string> = {
	'https://images.pokemontcg.io/ex5/102.png':
		'https://den-cards.pokellector.com/56/Groudon.HL.102.png',
	'https://images.pokemontcg.io/ex5/102_hires.png':
		'https://den-cards.pokellector.com/56/Groudon.HL.102.png',
};

export function hashSha256(input: string) {
	return createHash('sha256').update(input, 'utf8').digest('hex');
}

async function getBlur(buffer: Buffer) {
	return getPlaiceholder(buffer, {size: 8, format: ['webp']}).then(
		R.prop('base64'),
	);
}

type Props =
	| {url: string; dir: 'pokedex'; id: string}
	| {url: string; dir: 'cards'; set: string; id: string; large: boolean};

export async function fetchAndStoreImageAndBlur(props: Props) {
	const filePath =
		props.dir === 'pokedex'
			? path.join('.images', 'pokedex', `${props.id}.webp`)
			: path.join(
					'.images',
					'cards',
					props.set,
					`${props.id}${props.large ? '_large' : ''}.webp`,
				);

	await fsp.mkdir(path.dirname(filePath), {recursive: true});
	const exists = fs.existsSync(filePath);
	if (!exists) {
		await http(PATCHED_URLS[props.url] ?? props.url, {retry: {retries: 10}})
			.then((r) => r.arrayBuffer())
			.then((ab) => Buffer.from(ab))
			.then((b) => sharp(b).webp({quality: 80}).toFile(filePath));
	}

	const buf = await fsp.readFile(filePath).then((b) => Buffer.from(b));

	const blurPath = path.join(
		path.dirname(filePath),
		`${path.basename(filePath, path.extname(filePath))}_placeholder`,
	);

	if (!fs.existsSync(blurPath)) {
		const blur = await getBlur(buf);
		await fsp.writeFile(blurPath, blur);
	}
}

const basePokedexImageUrl = `https://raw.githubusercontent.com/remirth/sprites/master/sprites/pokemon/`;
function createPokedexUrl(pokedexNumber: number) {
	return `${basePokedexImageUrl}${pokedexNumber}.png`;
}

export async function prefetchImagesForCards(set: string, cards: CardFile) {
	await Promise.all(
		cards.map(async (card) => {
			const tasks = [];
			tasks.push(
				lazyLoaded(card.images.small, () =>
					fetchAndStoreImageAndBlur({
						url: card.images.small,
						dir: 'cards',
						id: card.id,
						set,
						large: false,
					}),
				),
			);

			tasks.push(
				lazyLoaded(card.images.large, () =>
					fetchAndStoreImageAndBlur({
						url: card.images.large,
						dir: 'cards',
						id: card.id,
						set,
						large: true,
					}),
				),
			);

			for (const pokedexNumber of card.nationalPokedexNumbers ?? []) {
				const imageUrl = createPokedexUrl(pokedexNumber);
				tasks.push(
					lazyLoaded(imageUrl, () =>
						fetchAndStoreImageAndBlur({
							url: imageUrl,
							dir: 'pokedex',
							id: String(pokedexNumber),
						}),
					),
				);
			}

			await Promise.all(tasks);
		}),
	);
}
