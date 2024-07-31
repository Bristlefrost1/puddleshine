import { APIInteractionResponse } from 'discord-api-types/v10';

class JsonResponse extends Response {
	constructor(body?: any, init?: ResponseInit | undefined) {
		const jsonBody = JSON.stringify(body);
		init = init || {
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},
		};
		super(jsonBody, init);
	}
}

class InteractionResponse extends Response {
	constructor(body: APIInteractionResponse, init?: ResponseInit | undefined) {
		const jsonBody = JSON.stringify(body);
		init = init || {
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},
		};
		super(jsonBody, init);
	}
}

export { JsonResponse, InteractionResponse };
