import * as R from 'remeda';
import {toError} from './errors';
import {http} from './http';
import {prefetchImagesForCards} from './image';
import {CardFileSchema, type PokemonSet, PokemonSetFileSchema} from './schemas';

const setUrl = new URL(
	'https://raw.githubusercontent.com/remirth/pokemon-tcg-data/master/sets/en.json',
);

const baseCardUrl = `https://raw.githubusercontent.com/remirth/pokemon-tcg-data/master/cards/en/`;

async function fetchAndLoadCardImages(set: PokemonSet) {
	try {
		const cardsUrl = `${baseCardUrl}${set.id}`;
		const cards = await http(cardsUrl)
			.then((res) => res.json())
			.then(CardFileSchema.assert);

		console.log('Loaded cards for', set.id);

		await prefetchImagesForCards(set.id, cards);
		console.log('Loaded images for', set.id);
	} catch (e) {
		console.error('Failed to load images for', set.id, e);
		throw e;
	}
}

console.log('Fetching sets!');
const sets = await http(setUrl)
	.then((r) => r.json())
	.then(PokemonSetFileSchema.assert);
console.log('Got sets:', sets.length);

const failed = await Promise.allSettled(sets.map(fetchAndLoadCardImages)).then(
	R.piped(
		R.filter((task) => task.status === 'rejected'),
		R.map(R.prop('reason')),
		R.map(toError),
	),
);

failed.length && console.warn(failed);
process.exit(failed.length);
