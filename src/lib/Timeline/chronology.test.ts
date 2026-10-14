import { describe, it, expect } from 'vitest';
import { toTimelineData } from './chronology';

const date = (year: number | null, month: number | null = null, day: number | null = null) => ({
	year,
	month,
	day,
	hour: null,
	minute: null,
	second: null,
	millisecond: null,
	display_date: year ? String(year) : '',
	format: ''
});

const OLD = 'https://msp-vedene.fr/media/images';

function chronology() {
	return [
		{
			type: 'title',
			value: {
				text: { headline: 'Maison de santé', text: 'Depuis 2012' },
				media: { url: `${OLD}/seminaire.original.jpg`, thumbnail: `${OLD}/seminaire.max-165x165.jpg` }
			}
		},
		{
			type: 'events',
			value: [
				{
					start_date: date(2013, 1, 1),
					end_date: date(2015, 9, 30),
					text: { headline: 'Construction' },
					media: { url: `${OLD}/chantier.original.jpg`, thumbnail: `${OLD}/chantier.max-165x165.jpg` }
				},
				{
					start_date: date(2016, 6, 1),
					end_date: date(null),
					text: { headline: 'Inauguration' },
					media: { url: 'https://www.laprovence.com/article.html', thumbnail: '' }
				}
			]
		}
	];
}

const media = {
	'seminaire.original.jpg': '/_app/immutable/assets/seminaire.abc.jpeg',
	'seminaire.max-165x165.jpg': '/_app/immutable/assets/seminaire.max-165x165.def.jpg',
	'chantier.original.jpg': '/_app/immutable/assets/chantier.ghi.jpg',
	'chantier.max-165x165.jpg': '/_app/immutable/assets/chantier.max-165x165.jkl.jpg'
};

describe('toTimelineData', () => {
	it('takes the title from the first block and the events from the second', () => {
		const data = toTimelineData(chronology());
		expect(data.title.text.headline).toBe('Maison de santé');
		expect(data.events.map((e) => e.text.headline)).toEqual(['Construction', 'Inauguration']);
	});

	it('gives TimelineJS an empty string for every date part that is null', () => {
		const [construction] = toTimelineData(chronology()).events;
		expect(construction.start_date).toMatchObject({ year: 2013, month: 1, day: 1, hour: '', millisecond: '' });
		expect(construction.end_date).toMatchObject({ year: 2015, hour: '' });
	});

	it('drops an end date with no year, month or day, and keeps one with a year', () => {
		const [construction, inauguration] = toTimelineData(chronology()).events;
		expect(construction.end_date).toBeDefined();
		expect(inauguration).not.toHaveProperty('end_date');
	});

	it('points each image and thumbnail at its copy, by file name', () => {
		const data = toTimelineData(chronology(), media);
		expect(data.title.media).toMatchObject({
			url: media['seminaire.original.jpg'],
			thumbnail: media['seminaire.max-165x165.jpg']
		});
		expect(data.events[0].media).toMatchObject({
			url: media['chantier.original.jpg'],
			thumbnail: media['chantier.max-165x165.jpg']
		});
	});

	it('leaves a media url without a copy as it is', () => {
		const data = toTimelineData(chronology(), media);
		expect(data.events[1].media.url).toBe('https://www.laprovence.com/article.html');
	});

	it('does not modify the chronology it is given', () => {
		const input = chronology();
		const before = structuredClone(input);
		toTimelineData(input, media);
		expect(input).toEqual(before);
	});
});
