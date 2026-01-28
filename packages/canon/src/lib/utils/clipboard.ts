/**
 * Clipboard utility for copying text to clipboard
 * Works across browsers with fallback for older browsers
 */

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves to true on success, false on failure
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	// Modern clipboard API (preferred)
	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (err) {
			console.error('Clipboard API failed:', err);
			// Fall through to legacy method
		}
	}

	// Fallback for older browsers or non-secure contexts
	try {
		const textArea = document.createElement('textarea');
		textArea.value = text;

		// Make it invisible and out of view
		textArea.style.position = 'fixed';
		textArea.style.left = '-999999px';
		textArea.style.top = '-999999px';
		textArea.setAttribute('readonly', '');

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		const successful = document.execCommand('copy');
		document.body.removeChild(textArea);

		return successful;
	} catch (err) {
		console.error('Fallback copy failed:', err);
		return false;
	}
}
