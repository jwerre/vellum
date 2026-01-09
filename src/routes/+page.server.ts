import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		// const res = await fetch('http://localhost:5173/users.json');
		const res = await fetch('/users.json');
		const data = await res.json();
		return { users: data };
	} catch (e) {
		return { users: [], error: `Failed to load: ${e}` };
	}
};
