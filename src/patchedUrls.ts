import {trainCase} from 'change-case';
import type {Card} from './schemas';

export const PATCHED_URLS: Record<string, string | undefined> = {
	'https://images.pokemontcg.io/ex5/102.png':
		'https://den-cards.pokellector.com/56/Groudon.HL.102.png',
	'https://images.pokemontcg.io/ex5/102_hires.png':
		'https://den-cards.pokellector.com/56/Groudon.HL.102.png',
	'https://images.pokemontcg.io/ecard2/67.png':
		'https://images.pokemontcg.io/ecard2/67_hires.png',
	'https://images.pokemontcg.io/hsp/HGSS18_hires.png':
		'https://den-cards.pokellector.com/107/Tropical-Tidal-Wave.HGSS.18.6542.png',
	'https://images.pokemontcg.io/hsp/HGSS18.png':
		'https://den-cards.pokellector.com/107/Tropical-Tidal-Wave.HGSS.18.6542.png',
	'https://images.pokemontcg.io/xyp/XY39_hires.png':
		'https://images.pokemontcg.io/xyp/XY39.png',
	'https://images.pokemontcg.io/xyp/XY46_hires.png':
		'https://images.pokemontcg.io/xyp/XY46.png',
	'https://images.pokemontcg.io/xyp/XY68_hires.png':
		'https://images.pokemontcg.io/xyp/XY68.png',
	'https://images.pokemontcg.io/svp/102.png':
		'https://den-cards.pokellector.com/364/Offish.SVPEN.102.49344.png',
	'https://images.pokemontcg.io/svp/102_hires.png':
		'https://den-cards.pokellector.com/364/Offish.SVPEN.102.49344.png',
};

const PATCH_BASE = new URL('https://den-cards.pokellector.com/');
const PATCH_TEMPLATES: Record<
	string,
	| {
			id: string;
			slug: string;
			map?: Record<string, string | undefined>;
			spellingErrors?: Record<string, string | undefined>;
	  }
	| undefined
> = {
	mcd14: {id: '158', slug: 'MCD4'},
	mcd15: {id: '182', slug: 'MCD5'},
	mcd17: {
		id: '230',
		slug: 'MCD7',
		map: {
			'1': '18575',
			'2': '18569',
			'3': '18570',
			'4': '18573',
			'5': '18568',
			'6': '18567',
			'7': '18571',
			'8': '18578',
			'9': '18566',
			'10': '18572',
			'11': '18574',
			'12': '18565',
		},
		spellingErrors: {Yungoos: 'Yungoose'},
	},
	mcd18: {
		id: '265',
		slug: 'MCD8',
		map: {
			'1': '24571',
			'2': '24575',
			'3': '24572',
			'4': '24573',
			'5': '24576',
			'6': '24577',
			'7': '24578',
			'8': '24579',
			'9': '24574',
			'10': '24580',
			'11': '24581',
			'12': '24582',
		},
		spellingErrors: {},
	},
};

export function pathCardBasedOnSet(set: string, card: Card) {
	const template = PATCH_TEMPLATES[set];
	if (!template) return;
	const url = new URL(PATCH_BASE);
	const map = template.map?.[card.number];
	const name = template.spellingErrors?.[card.name] ?? card.name;
	url.pathname = `/${template.id}/${trainCase(name)}.${template.slug}.${card.number}${map ? `.${map}` : ''}.png`;

	card.images.large = url.toString();
	card.images.small = url.toString();
}
