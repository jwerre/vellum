import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const res = await fetch('/api/users');
		const data = await res.json();
		return { users: data };
	} catch (e) {
		return { users: [], error: `Failed to load: ${e}` };
	}
};
