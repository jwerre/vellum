import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model, vellumConfig, Collection } from '../lib/index.js';

interface UserSchema {
	id: number;
	name: string;
	age?: number;
	priority?: number;
	createdAt?: string;
}

class UserModel extends Model<UserSchema> {
	endpoint = '/users';
}

class UserCollection extends Collection<UserModel, UserSchema> {
	model = UserModel;
	endpoint = '/users';

	// use a getter to set model when initializing the collection with data
	// get model() { return UserModel; }
}

describe('Vellum Collection', () => {
	beforeEach(() => {
		vellumConfig.origin = 'https://api.example.com';
		vellumConfig.headers = { 'Content-Type': 'application/json' };
		vi.stubGlobal('fetch', vi.fn());
	});

	describe('Basics', () => {
		it('should create model instances from raw data in constructor', () => {
			const data = [{ id: 1, name: 'Alice' }];
			const collection = new UserCollection();
			collection.reset(data);

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
			class TestCollection extends Collection<UserModel, UserSchema> {
				endpoint = '/users';
				// use a getter here so that Models are available in the reset method used by constructor
				get model() {
					return UserModel;
				}
			}

			const collection = new TestCollection([{ id: 1, name: 'Alice' }]);
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

	describe('Comparator and Sorting', () => {
		it('should sort by string attribute name', () => {
			class SortedByNameCollection extends UserCollection {
				comparator = () => 'name';
			}

			const collection = new SortedByNameCollection();
			collection.add({ id: 1, name: 'Zara' });
			collection.add({ id: 2, name: 'Alice' });
			collection.add({ id: 3, name: 'Michael' });

			expect(collection.items[0].get('name')).toBe('Alice');
			expect(collection.items[1].get('name')).toBe('Michael');
			expect(collection.items[2].get('name')).toBe('Zara');
		});

		it('should sort by numeric attribute name', () => {
			class SortedByAgeCollection extends UserCollection {
				comparator = () => 'age';
			}

			const collection = new SortedByAgeCollection();
			collection.add({ id: 1, name: 'Alice', age: 30 });
			collection.add({ id: 2, name: 'Bob', age: 25 });
			collection.add({ id: 3, name: 'Charlie', age: 35 });

			expect(collection.items[0].get('age')).toBe(25);
			expect(collection.items[1].get('age')).toBe(30);
			expect(collection.items[2].get('age')).toBe(35);
		});

		it('should sort using sortBy function (single argument)', () => {
			class SortedBySortByCollection extends UserCollection {
				comparator = () => (model: UserModel) => model.get('age') || 0;
			}

			const collection = new SortedBySortByCollection();
			collection.add({ id: 1, name: 'Alice', age: 30 });
			collection.add({ id: 2, name: 'Bob', age: 25 });
			collection.add({ id: 3, name: 'Charlie', age: 35 });

			expect(collection.items[0].get('name')).toBe('Bob');
			expect(collection.items[1].get('name')).toBe('Alice');
			expect(collection.items[2].get('name')).toBe('Charlie');
		});

		it('should sort using sort comparator function (two arguments)', () => {
			class SortedBySortCollection extends UserCollection {
				comparator = () => (a: UserModel, b: UserModel) => {
					const aPriority = a.get('priority') || 0;
					const bPriority = b.get('priority') || 0;
					if (aPriority < bPriority) return -1;
					if (aPriority > bPriority) return 1;
					return 0;
				};
			}

			const collection = new SortedBySortCollection();
			collection.add({ id: 1, name: 'Low', priority: 3 });
			collection.add({ id: 2, name: 'High', priority: 1 });
			collection.add({ id: 3, name: 'Medium', priority: 2 });

			expect(collection.items[0].get('name')).toBe('High');
			expect(collection.items[1].get('name')).toBe('Medium');
			expect(collection.items[2].get('name')).toBe('Low');
		});

		it('should sort on reset', () => {
			class SortedCollection extends UserCollection {
				comparator = () => 'name';
			}

			const collection = new SortedCollection();
			collection.reset([
				{ id: 1, name: 'Zara' },
				{ id: 2, name: 'Alice' },
				{ id: 3, name: 'Michael' }
			]);

			expect(collection.items[0].get('name')).toBe('Alice');
			expect(collection.items[1].get('name')).toBe('Michael');
			expect(collection.items[2].get('name')).toBe('Zara');
		});

		it('should maintain sort order when adding multiple items', () => {
			class SortedByIdCollection extends UserCollection {
				comparator = () => 'id';
			}

			const collection = new SortedByIdCollection();
			collection.add({ id: 5, name: 'Five' });
			collection.add({ id: 2, name: 'Two' });
			collection.add({ id: 8, name: 'Eight' });
			collection.add({ id: 1, name: 'One' });

			expect(collection.items[0].get('id')).toBe(1);
			expect(collection.items[1].get('id')).toBe(2);
			expect(collection.items[2].get('id')).toBe(5);
			expect(collection.items[3].get('id')).toBe(8);
		});

		it('should not sort when comparator is undefined', () => {
			const collection = new UserCollection();
			collection.add({ id: 3, name: 'Charlie' });
			collection.add({ id: 1, name: 'Alice' });
			collection.add({ id: 2, name: 'Bob' });

			// Should maintain insertion order
			expect(collection.items[0].get('name')).toBe('Charlie');
			expect(collection.items[1].get('name')).toBe('Alice');
			expect(collection.items[2].get('name')).toBe('Bob');
		});

		it('should not sort when comparator returns undefined', () => {
			class NoComparatorCollection extends UserCollection {
				comparator = () => undefined;
			}

			const collection = new NoComparatorCollection();
			collection.add({ id: 3, name: 'Charlie' });
			collection.add({ id: 1, name: 'Alice' });
			collection.add({ id: 2, name: 'Bob' });

			// Should maintain insertion order
			expect(collection.items[0].get('name')).toBe('Charlie');
			expect(collection.items[1].get('name')).toBe('Alice');
			expect(collection.items[2].get('name')).toBe('Bob');
		});

		it('should handle reverse sort using sort comparator', () => {
			class ReverseSortedCollection extends UserCollection {
				comparator = () => (a: UserModel, b: UserModel) => {
					const aName = a.get('name') || '';
					const bName = b.get('name') || '';
					if (aName > bName) return -1;
					if (aName < bName) return 1;
					return 0;
				};
			}

			const collection = new ReverseSortedCollection();
			collection.add({ id: 1, name: 'Alice' });
			collection.add({ id: 2, name: 'Zara' });
			collection.add({ id: 3, name: 'Michael' });

			expect(collection.items[0].get('name')).toBe('Zara');
			expect(collection.items[1].get('name')).toBe('Michael');
			expect(collection.items[2].get('name')).toBe('Alice');
		});

		it('should sort with complex sortBy function', () => {
			class ComplexSortCollection extends UserCollection {
				comparator = () => (model: UserModel) => {
					// Sort by name length, then alphabetically
					const name = model.get('name') || '';
					return name.length * 1000 + name.charCodeAt(0);
				};
			}

			const collection = new ComplexSortCollection();
			collection.add({ id: 1, name: 'Bob' });
			collection.add({ id: 2, name: 'Alice' });
			collection.add({ id: 3, name: 'Jo' });
			collection.add({ id: 4, name: 'Charlie' });

			// Jo (2 chars), Bob (3 chars), Alice (5 chars), Charlie (7 chars)
			expect(collection.items[0].get('name')).toBe('Jo');
			expect(collection.items[1].get('name')).toBe('Bob');
			expect(collection.items[2].get('name')).toBe('Alice');
			expect(collection.items[3].get('name')).toBe('Charlie');
		});
	});
});
