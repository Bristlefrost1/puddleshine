import * as DAPI from 'discord-api-types/v10';

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
	constructor(body: DAPI.APIInteractionResponse, init?: ResponseInit | undefined) {
		const jsonBody = JSON.stringify(body);
		init = init || {
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},
		};
		super(jsonBody, init);
	}
}

class FormDataResponse extends Response {
	constructor(payloadJson: DAPI.APIInteractionResponseCallbackData, attachments: File[]) {
		const formData = new FormData();

		formData.append('payload_json', JSON.stringify(payloadJson));

		for (let i = 0; i < attachments.length; i++) {
			const attachment = attachments[i];

			formData.append(`files[${i}]`, attachment);
		}

		super(formData);
	}
}

export { JsonResponse, InteractionResponse, FormDataResponse };
