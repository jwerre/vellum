import { Model, Collection } from '$lib/index.js';

export interface User {
	id: string;
	name: string;
	email: string;
	created: string;
}

const FIRST_NAMES = [
	'Alice',
	'Bob',
	'Charlie',
	'Diana',
	'Edward',
	'Fiona',
	'George',
	'Hannah',
	'Ian',
	'Julia'
];
const LAST_NAMES = [
	'Smith',
	'Johnson',
	'Williams',
	'Brown',
	'Jones',
	'Garcia',
	'Miller',
	'Davis',
	'Rodriguez',
	'Martinez'
];

export class UserModel extends Model<User> {
	endpoint() {
		return '/api/users';
	}
}

export class UserCollection extends Collection<UserModel, User> {
	get model() {
		return UserModel;
	}

	endpoint() {
		return '/api/users';
	}

	async updateUser(id: User['id'], data: Pick<Partial<User>, 'name' | 'email'>) {
		const user = this.items.find((user) => user.get('id') === id);
		if (user) {
			user.set(data);
			// console.log(user.toJSON());
			await user.save(); // PUT to /api/users/:id
		}
	}

	async addUser() {
		const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
		const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
		const uid = Math.random().toString(36).substring(2, 15);
		const email = `${first.toLowerCase()}.${last.toLowerCase()}@${uid}.com`;
		const newUser = new UserModel({
			name: `${first} ${last}`,
			email: email
		});

		await newUser.save(); // POST to /api/users/:id
		this.add(newUser); // Add to collection
	}

	async deleteUser(userId: User['id']) {
		if (!userId) return;
		const user = this.items.find((user) => user.get('id') === userId);
		if (user) {
			await user.destroy();
			this.fetch();
		}
	}
}
