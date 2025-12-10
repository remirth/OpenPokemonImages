import assert from 'node:assert';
import {inspect} from 'node:util';
import {TaskError} from './errors';
import {http} from './http';
import {prefetchImagesForCards} from './image';
import {CardFileSchema, type PokemonSet, PokemonSetFileSchema} from './schemas';

const setUrl = new URL(
	'https://raw.githubusercontent.com/remirth/pokemon-tcg-data/master/sets/en.json',
);

const baseCardUrl = `https://raw.githubusercontent.com/remirth/pokemon-tcg-data/master/cards/en/`;

let i = 0;
let j = 0;
async function fetchAndLoadCardImages(set: PokemonSet) {
	const cardsUrl = `${baseCardUrl}${set.id}.json`;
	const cards = await http(cardsUrl, {
		map: (res) => res.json().then(CardFileSchema.assert),
		assert: (c) => assert.ok(c),
	});

	console.log('Sets fetched', ++i);
	await prefetchImagesForCards(set.id, cards);
	console.log('Sets loaded', ++j, set.id);
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
	console.error(inspect(e, {depth: 100, colors: false}));
	process.exit(1);
}
