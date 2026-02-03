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

export const request = async (
	url: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: string;
	}
): Promise<unknown> => {
	const response = await fetch(url, options);

	if (!response.ok) {
		throw new Error(`Vellum Collection Error: ${response.statusText}`);
	}

	if (response.status === 204) {
		return null;
	}

	return response.json();
};
