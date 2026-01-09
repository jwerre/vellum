import { Model, Collection } from '$lib/index.js';

export interface User {
	id: string;
	name: string;
	email: string;
	created: string;
}

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
}
