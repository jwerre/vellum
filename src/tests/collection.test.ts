import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model, vellumConfig, Collection } from '../lib/index.js';

interface UserSchema {
	id: number;
	name: string;
}

class UserModel extends Model<UserSchema> {
	urlRoot() {
		return '/users';
	}
}

class UserCollection extends Collection<UserModel, UserSchema> {
	get model() {
		return UserModel;
	}
	url() {
		return '/users';
	}
}

describe('Vellum Collection', () => {
	beforeEach(() => {
		vellumConfig.baseUrl = 'https://api.example.com';
		vellumConfig.headers = { 'Content-Type': 'application/json' };
		vi.stubGlobal('fetch', vi.fn());
	});
	it('should create model instances from raw data in constructor', () => {
		const data = [{ id: 1, name: 'Alice' }];
		const collection = new UserCollection(data);

		expect(collection.length).toBe(1);
		expect(collection.items[0]).toBeInstanceOf(UserModel);
		// Must use .get() because attributes are private in Model
		expect(collection.items[0].get('name')).toBe('Alice');
	});

	it('should add new data and wrap it in a Model', () => {
		const collection = new UserCollection();
		collection.add({ id: 2, name: 'Bob' });

		expect(collection.items[0]).toBeInstanceOf(UserModel);
		expect(collection.items[0].get('name')).toBe('Bob');
	});

	it('should reset the collection with new data', () => {
		const collection = new UserCollection([{ id: 1, name: 'Alice' }]);
		collection.reset([{ id: 3, name: 'Charlie' }]);

		expect(collection.length).toBe(1);
		expect(collection.items[0].get('name')).toBe('Charlie');
	});

	it('should fetch data and populate models', async () => {
		const mockData = [
			{ id: 10, name: 'James' },
			{ id: 11, name: 'Lily' }
		];

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => mockData
		} as Response);

		const collection = new UserCollection();
		await collection.fetch({ search: { active: true } });

		// Check URL construction
		expect(vi.mocked(fetch)).toHaveBeenCalledWith(
			'https://api.example.com/users?active=true',
			expect.any(Object)
		);

		// Check data transformation
		expect(collection.length).toBe(2);
		expect(collection.items[1].get('name')).toBe('Lily');
		expect(collection.items[1]).toBeInstanceOf(UserModel);
	});

	it('should propagate fetch errors', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			statusText: 'Unauthorized'
		} as Response);

		const collection = new UserCollection();
		await expect(collection.fetch()).rejects.toThrow('Vellum Collection Error: Unauthorized');
	});
});
