import * as DAPI from 'discord-api-types/v10';

import { errorEmbed } from '#discord/responses.js';

import * as config from '#config.js';

type ListMessage = {
	embed: DAPI.APIEmbed;
	scrollActionRow?: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>;
};

function splitIntoPages(items: string[]) {
	const pages: string[][] = [];

	for (let i = 0; i < items.length; i += config.CATCHA_LIST_PAGE_SIZE) {
		pages.push(items.slice(i, i + config.CATCHA_LIST_PAGE_SIZE));
	}

	return pages;
}

function buildScrollButtons(action: string, pageNumber: number, listDataString?: string): DAPI.APIButtonComponent[] {
	return [
		{
			type: DAPI.ComponentType.Button,
			label: '← Previous',
			style: DAPI.ButtonStyle.Secondary,
			custom_id: `${action}/prev:${pageNumber}${listDataString !== undefined ? `/${listDataString}` : ''}`,
		},
		{
			type: DAPI.ComponentType.Button,
			label: 'Next →',
			style: DAPI.ButtonStyle.Secondary,
			custom_id: `${action}/next:${pageNumber}${listDataString !== undefined ? `/${listDataString}` : ''}`,
		},
	];
}

function scrollListMessage(options: {
	action: string;
	pageData: string; // (next or prev):(current page number)
	listDataString?: string;

	items: string[];

	title?: string;
	author?: DAPI.APIEmbedAuthor;
	description?: string;
}): ListMessage {
	const pageData = options.pageData.split(':');
	const nextOrPrev = pageData[0] as 'next' | 'prev';
	const currentPageNumber = Number.parseInt(pageData[1]);

	const pages = splitIntoPages(options.items);

	let newPageNumber = currentPageNumber + (nextOrPrev === 'next' ? 1 : -1);

	if (newPageNumber < 1) {
		newPageNumber = pages.length;
	} else if (newPageNumber > pages.length) {
		newPageNumber = 1;
	}

	const newPageIndex = newPageNumber - 1;
	const newPage = pages[newPageIndex];

	if (!newPage) {
		return {
			embed: errorEmbed(`No page numbered ${newPageNumber} found.`, options.title, options.author),
		};
	}

	return {
		embed: {
			title: options.title,
			author: options.author,
			description: `${options.description ?? ''}${newPage.join('\n')}`,
			footer: { text: `Page ${newPageNumber}/${pages.length}` },
			timestamp: new Date().toISOString(),
		},
		scrollActionRow:
			pages.length > 1 ?
				{
					type: DAPI.ComponentType.ActionRow,
					components: buildScrollButtons(options.action, newPageNumber, options.listDataString),
				}
			:	undefined,
	};
}

function createListMessage(options: {
	action: string;
	listDataString?: string;

	items: string[];
	pageNumber?: number;

	title?: string;
	author?: DAPI.APIEmbedAuthor;
	description?: string;
}): ListMessage {
	if (options.items.length === 0) {
		return {
			embed: errorEmbed('This list is empty.', options.title, options.author),
		};
	}

	const pages = splitIntoPages(options.items);
	const pageNumber = options.pageNumber ?? 1;
	const pageIndex = pageNumber - 1;

	const page = pages[pageIndex];

	if (!page) {
		return {
			embed: errorEmbed(`No page numbered ${pageNumber} found.`, options.title, options.author),
		};
	}

	return {
		embed: {
			title: options.title,
			author: options.author,
			description: `${options.description ?? ''}${page.join('\n')}`,
			footer: { text: `Page ${pageNumber}/${pages.length}` },
			timestamp: new Date().toISOString(),
		},
		scrollActionRow:
			pages.length > 1 ?
				{
					type: DAPI.ComponentType.ActionRow,
					components: buildScrollButtons(options.action, pageNumber, options.listDataString),
				}
			:	undefined,
	};
}

export { createListMessage, scrollListMessage };
