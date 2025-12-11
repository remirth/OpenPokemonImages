import assert from 'node:assert';
import {inspect} from 'node:util';
import {TaskError} from './errors';
import {http} from './http';
import {prefetchImagesForCards} from './image';
import {lazyLoaded} from './lazy';
import {MISSING_LINKS} from './missing';
import {CardFileSchema, type PokemonSet, PokemonSetFileSchema} from './schemas';

const setUrl = new URL(
	'https://raw.githubusercontent.com/remirth/pokemon-tcg-data/master/sets/en.json',
);

const baseCardUrl = `https://raw.githubusercontent.com/remirth/pokemon-tcg-data/master/cards/en/`;

let setsFailed = 0;
const setsComplete = new Set<string>();

async function fetchAndLoadCardImages(set: PokemonSet) {
	const cardsUrl = `${baseCardUrl}${set.id}.json`;
	const cards = await lazyLoaded(set.id, () =>
		http(cardsUrl, {
			map: (res) => res.json().then(CardFileSchema.assert),
			assert: (c) => assert.ok(c),
		}),
	);

	try {
		await prefetchImagesForCards(set.id, cards);
		setsComplete.add(set.id);
		console.log('Sets complete', setsComplete.size);
	} catch (e) {
		console.log('Sets failed', ++setsFailed, set.id);
		throw e;
	} finally {
		console.log('Sets attempted', setsFailed + setsComplete.size);
	}
}

async function loadSets() {
	console.log('Fetching sets!');
	const sets = await lazyLoaded('sets', () =>
		http(setUrl, {
			map: (res) => res.json().then(PokemonSetFileSchema.assert),
			assert: (c) => assert.ok(c),
		}),
	);
	console.log('Got sets:', sets.length);
	const tasks = [];
	for (const set of sets) {
		console.log('Fetching', set.id);
		const current = await Promise.allSettled([fetchAndLoadCardImages(set)]);
		tasks.push(...current);
	}

	TaskError.assert('Failed to fetch and load card images!', tasks);
}

async function main() {
	let exitCode = 1;
	let errorCount = 0;
	const MAX_ITER = 100;
	let requiredAttempts = 0;
	for (let i = 0; i < MAX_ITER; ++i) {
		requiredAttempts++;
		try {
			await loadSets();
			exitCode = 0;
			i += MAX_ITER;
		} catch (e) {
			if (e instanceof TaskError) {
				e.traverse((error) => {
					console.error(inspect(error, {depth: 100, colors: false}));
					errorCount++;
				});
			} else {
				console.error(inspect(e, {depth: 100, colors: false}));
				errorCount++;
			}

			console.error(
				'MISSING_LINKS',
				inspect(MISSING_LINKS, {depth: 100, colors: false}),
			);

			await Bun.sleep(10_000);
		}
	}

	await Bun.write(
		'logs/metrics.json',
		JSON.stringify({MISSING_LINKS, requiredAttempts, errorCount}, null, 2),
		{
			createPath: true,
		},
	);

	process.exit(exitCode);
}

await main();
