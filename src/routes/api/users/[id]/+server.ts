import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { readUsers, writeUsers } from '../../_utils.js';

// GET - Get a single user by ID
export async function GET({ params }: RequestEvent) {
	const { id } = params;

	const users = await readUsers();
	const user = users.find((u) => u.id === id);

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	return json(user);
}

// PUT - Update an existing user
export async function PUT({ params, request }: RequestEvent) {
	try {
		const { id } = params;
		const body = await request.json();
		const { name, email } = body;

		const users = await readUsers();
		const userIndex = users.findIndex((u) => u.id === id);

		if (userIndex === -1) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Check if email already exists for a different user
		if (email && users.some((u) => u.email === email && u.id !== id)) {
			return json({ error: 'Email already exists' }, { status: 409 });
		}

		// Update user fields
		if (name) users[userIndex].name = name;
		if (email) users[userIndex].email = email;

		await writeUsers(users);

		return json(users[userIndex]);
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
}

// DELETE - Delete a user
export async function DELETE({ params }: RequestEvent) {
	const { id } = params;

	const users = await readUsers();
	const userIndex = users.findIndex((u) => u.id === id);

	if (userIndex === -1) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const deletedUser = users[userIndex];
	users.splice(userIndex, 1);
	await writeUsers(users);

	return json({ message: 'User deleted successfully', user: deletedUser });
}
