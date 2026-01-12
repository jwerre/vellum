/**
 * Escapes special characters in a string for use in HTML.
 * @param text The string to be escaped.
 * @returns The escaped string.
 */
export const escapeHTML = (text: string): string => {
	const lookup: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	};

	return text.replace(/[&<>"']/g, (char) => lookup[char]);
};
