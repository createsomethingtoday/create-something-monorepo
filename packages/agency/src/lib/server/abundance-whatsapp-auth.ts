const textEncoder = new TextEncoder();

function timingSafeBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
	let diff = left.length ^ right.length;
	const length = Math.max(left.length, right.length);

	for (let index = 0; index < length; index += 1) {
		diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
	}

	return diff === 0;
}

export async function isValidMetaSignature(
	payload: string,
	signatureHeader: string | null | undefined,
	appSecret: string | null | undefined
): Promise<boolean> {
	const secret = appSecret?.trim();

	if (!secret || !signatureHeader?.startsWith('sha256=')) {
		return false;
	}

	const expectedHex = signatureHeader.slice('sha256='.length).toLowerCase();

	if (!/^[a-f0-9]{64}$/.test(expectedHex)) {
		return false;
	}

	const key = await crypto.subtle.importKey(
		'raw',
		textEncoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
	const actualHex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');

	return timingSafeBytesEqual(textEncoder.encode(actualHex), textEncoder.encode(expectedHex));
}
