import assert from 'node:assert';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {getPlaiceholder} from 'plaiceholder';
import * as R from 'remeda';
import sharp from 'sharp';
import {HttpError, TaskError} from './errors';
import {http} from './http';
import {lazyLoaded} from './lazy';
import {MISSING_LINKS} from './missing';
import type {CardFile} from './schemas';

const PATCHED_URLS: Record<string, string> = {
	'https://images.pokemontcg.io/ex5/102.png':
		'https://den-cards.pokellector.com/56/Groudon.HL.102.png',
	'https://images.pokemontcg.io/ex5/102_hires.png':
		'https://den-cards.pokellector.com/56/Groudon.HL.102.png',
};

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
		try {
			await http(
				PATCHED_URLS[props.url] ?? props.url,
				{
					map: (r) => r.arrayBuffer().then((ab) => Buffer.from(ab)),
					assert: (b) =>
						assert.ok(b.length, `${props.url} returned empty buffer!`),
				},
				{retry: {retries: 10, timeoutMs: 5_000}},
			).then((b) => sharp(b).webp({quality: 80}).toFile(filePath));
		} catch (e) {
			if (e instanceof HttpError && e.status === 404) {
				MISSING_LINKS.push(props.url);
			}

			throw e;
		}
	}

	const buf = await fsp.readFile(filePath);
	assert.ok(buf.length, `File at ${filePath} returned a zero length buffer!`);

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
	await Promise.allSettled(
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

			await Promise.allSettled(tasks).then(
				TaskError.pipedAssert(`Failed to load images for card: ${card.id}`),
			);
		}),
	).then(TaskError.pipedAssert(`Failed to load cards for set: ${set}`));
}
