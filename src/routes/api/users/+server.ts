import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { type User, readUsers, writeUsers, generateId } from '../_utils.js';

// GET - Get all users
export const GET: RequestHandler = async () => {
	try {
		const users = await readUsers();
		return json(users);
	} catch {
		return json({ error: 'Failed to load users' }, { status: 500 });
	}
};

// POST - Create a new user
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { name, email } = body;

		if (!name?.length || !email?.length) {
			return json({ error: 'Name and email are required' }, { status: 400 });
		}

		const users = await readUsers();

		// Check if email already exists
		if (users.some((u) => u.email === email)) {
			return json({ error: 'Email already exists' }, { status: 409 });
		}

		const newUser: User = {
			id: generateId(),
			name,
			email,
			created: new Date().toISOString()
		};

		users.push(newUser);
		await writeUsers(users);

		return json(newUser, { status: 201 });
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
};
