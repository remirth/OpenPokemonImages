import assert from 'node:assert';
import {inspect} from 'node:util';
import {TaskError} from './errors';
import {http} from './http';
import {prefetchImagesForCards} from './image';
import {MISSING_LINKS} from './missing';
import {CardFileSchema, type PokemonSet, PokemonSetFileSchema} from './schemas';

const setUrl = new URL(
	'https://raw.githubusercontent.com/remirth/pokemon-tcg-data/master/sets/en.json',
);

const baseCardUrl = `https://raw.githubusercontent.com/remirth/pokemon-tcg-data/master/cards/en/`;

let setsFetched = 0;
let setsComplete = 0;
let setsFailed = 0;

async function fetchAndLoadCardImages(set: PokemonSet) {
	const cardsUrl = `${baseCardUrl}${set.id}.json`;
	const cards = await http(cardsUrl, {
		map: (res) => res.json().then(CardFileSchema.assert),
		assert: (c) => assert.ok(c),
	});

	console.log('Sets fetched', ++setsFetched);
	try {
		await prefetchImagesForCards(set.id, cards);
		console.log('Sets complete', ++setsComplete, set.id);
	} catch (e) {
		console.log('Sets failed', ++setsFailed);
		throw e;
	} finally {
		console.log('Sets attempted', setsFailed + setsComplete);
	}
}

console.log('Fetching sets!');
const sets = await http(setUrl, {
	map: (res) => res.json().then(PokemonSetFileSchema.assert),
	assert: (c) => assert.ok(c),
});
console.log('Got sets:', sets.length);

try {
	await Promise.allSettled(sets.map(fetchAndLoadCardImages)).then(
		TaskError.pipedAssert('Failed to fetch and load card images!'),
	);
	process.exit(0);
} catch (e) {
	if (e instanceof TaskError) {
		e.traverse((error) =>
			console.error(inspect(error, {depth: 100, colors: false})),
		);
	} else {
		console.error(inspect(e, {depth: 100, colors: false}));
	}

	console.error(
		'MISSING_LINKS',
		inspect(MISSING_LINKS, {depth: 100, colors: false}),
	);

	await Bun.write(
		'logs/missing_links.json',
		JSON.stringify(MISSING_LINKS, null, 2),
		{
			createPath: true,
		},
	);

	process.exit(1);
}
