import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TwilioInboundMessage {
	from: string;
	to: string;
	body: string;
	messageSid: string;
	numMedia: number;
}

export function parseTwilioInboundMessage(formData: FormData): TwilioInboundMessage {
	return {
		from: formData.get('From')?.toString() || '',
		to: formData.get('To')?.toString() || '',
		body: formData.get('Body')?.toString() || '',
		messageSid: formData.get('MessageSid')?.toString() || '',
		numMedia: parseInt(formData.get('NumMedia')?.toString() || '0', 10)
	};
}

export function formDataToRecord(formData: FormData): Record<string, string> {
	const params: Record<string, string> = {};

	for (const [key, value] of formData.entries()) {
		params[key] = value.toString();
	}

	return params;
}

export function verifyTwilioSignature(
	authToken: string,
	signature: string,
	url: string,
	params: Record<string, string>
): boolean {
	const data = url + Object.keys(params).sort().map((key) => key + params[key]).join('');
	const expectedSignature = createHmac('sha1', authToken).update(data).digest('base64');

	try {
		const signatureBuffer = Buffer.from(signature);
		const expectedBuffer = Buffer.from(expectedSignature);

		return (
			signatureBuffer.length === expectedBuffer.length &&
			timingSafeEqual(signatureBuffer, expectedBuffer)
		);
	} catch {
		return false;
	}
}

export function twimlEmpty(): string {
	return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}
