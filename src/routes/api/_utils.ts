const { readFile, writeFile } = await import('fs/promises');
import { join } from 'path';

export interface User {
	id: string;
	name: string;
	email: string;
	created: string;
}

export const USERS_FILE = join(process.cwd(), 'src', 'routes', 'db.json');

export async function ensureUsersFileExists(): Promise<void> {
	try {
		await readFile(USERS_FILE);
	} catch {
		await writeFile(USERS_FILE, JSON.stringify([], null, '\t'));
	}
}

export async function readUsers(): Promise<User[]> {
	try {
		const data = await readFile(USERS_FILE, 'utf-8');
		return JSON.parse(data);
	} catch {
		return [];
	}
}

export async function writeUsers(users: User[]): Promise<void> {
	await writeFile(USERS_FILE, JSON.stringify(users, null, '\t'));
}

export function generateId(): string {
	return Math.random().toString(36).substring(2, 10);
}
