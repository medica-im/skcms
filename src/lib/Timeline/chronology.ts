/** A TimelineJS slide: passed through as Wagtail exported it, apart from dates and media. */
export type TimelineSlide = { [key: string]: any };

export interface TimelineData {
	title: TimelineSlide;
	events: TimelineSlide[];
}

/** Wagtail's timeline StreamField: a title block, then an events block. */
type ChronologyBlocks = { type: string; value: any }[];

const DATE_PARTS = ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond'];

function relink(slide: TimelineSlide, media: Record<string, string>): TimelineSlide {
	if (!slide.media) return slide;
	for (const key of ['url', 'thumbnail']) {
		const name = slide.media[key]?.split('/').pop();
		if (name && media[name]) slide.media[key] = media[name];
	}
	return slide;
}

function toEvent(source: TimelineSlide, media: Record<string, string>): TimelineSlide {
	const event = relink(structuredClone(source), media);
	for (const key of ['start_date', 'end_date']) {
		if (!event[key]) continue;
		for (const part of DATE_PARTS) {
			if (event[key][part] === null) event[key][part] = '';
		}
	}
	if (source.end_date && ['year', 'month', 'day'].every((p) => source.end_date[p] === null)) {
		delete event.end_date;
	}
	return event;
}

/**
 * TimelineJS data from a Wagtail chronology. TimelineJS wants '' where
 * Wagtail has null; `media` maps an image's file name to the URL of its copy.
 */
export function toTimelineData(
	blocks: ChronologyBlocks,
	media: Record<string, string> = {}
): TimelineData {
	return {
		title: relink(structuredClone(blocks[0].value), media),
		events: blocks[1].value.map((event: TimelineSlide) => toEvent(event, media))
	};
}
