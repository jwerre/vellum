import { type Mock, describe, it, expect, vi, beforeEach } from 'vitest';
import { configureVellum, Model, ValidationError } from '../lib/index.js';

interface TestSchema {
	_id?: string;
	name: string;
	email?: string;
	age?: number;
}

class TestModel extends Model<TestSchema> {
	endpoint(): string {
		return '/test';
	}
}

describe('Vellum Model', () => {
	// Reference fetch as a Mock type
	const fetchMock = vi.fn() as Mock;

	beforeEach(() => {
		vi.resetAllMocks();
		global.fetch = fetchMock;

		configureVellum({
			origin: 'https://api.example.com',
			idAttribute: '_id'
		});
	});

	describe('Basics', () => {
		it('should instantiate a model', async () => {
			const data = { name: 'Pecos Bill' };
			const model = new TestModel(data);
			expect(model.get('name')).toBe(data.name);
		});

		it('should set a single attribute', async () => {
			const email = 'test@example.com';
			const model = new TestModel();
			model.set('email', email);
			expect(model.get('email')).toBe(email);
		});

		it('should set multiple properties', async () => {
			const data = { name: 'John Smith', email: 'test@example.com' };
			const model = new TestModel();
			model.set(data);
			expect(model.get('name')).toBe(data.name);
			expect(model.get('email')).toBe(data.email);
		});

		it('should ensure that mode has a property', async () => {
			const data = { name: 'John Smith' };
			const model = new TestModel(data);
			model.set('email', 'test@example.com');
			expect(model.has('name')).toBe(true);
			expect(model.has('email')).toBe(true);
		});

		it('should unset a property', async () => {
			const data = { name: 'John Smith', email: 'test@example.com' };
			const model = new TestModel(data);
			expect(model.get('name')).toBe(data.name);
			expect(model.get('email')).toBe(data.email);
		});

		it('should clear the model', async () => {
			const model = new TestModel({ _id: '123', name: 'Some Item', email: 'test@example.com' });
			model.clear();
			expect(model.get('_id')).toBeUndefined();
			expect(model.get('name')).toBeUndefined();
			expect(model.get('email')).toBeUndefined();
			expect(model.toJSON()).toStrictEqual({});
		});

		it('should check if a model is new or not', async () => {
			const data = { name: 'New model' };
			const model = new TestModel(data);
			expect(model.isNew()).toBe(true);
			model.set('_id', '123');
			expect(model.isNew()).toBe(false);
		});

		it('should parse model attributes', async () => {
			const data = { _id: '123', name: 'Some Item' };
			const model = new TestModel(data);
			expect(model.toJSON()).toStrictEqual(data);
		});

		it('should apply an alternative id attribute', () => {
			class User extends Model<{ uniqueid?: string }> {
				idAttribute = 'uniqueid';
				endpoint() {
					return '/users';
				}
			}

			const user = new User();
			expect(user.idAttribute).toBe('uniqueid');
			expect(user.isNew()).toBe(true);
			user.set('uniqueid', '6966b9497bac517184d7151');
			expect(user.isNew()).toBe(false);
		});

		it('should apply default values', () => {
			const values = {
				name: 'New User',
				email: 'test@example.com',
				age: 18
			};

			class User extends Model<TestSchema> {
				defaults() {
					return values;
				}

				endpoint() {
					return '/users';
				}
			}

			const user = new User();
			expect(user.get('name')).toBe(values.name);
			expect(user.get('email')).toBe(values.email);
			expect(user.get('age')).toBe(values.age);
			expect(user.toJSON()).toStrictEqual(values);
		});
	});

	describe('Change Tracking', () => {
		it('should track changed attributes after set()', () => {
			const model = new TestModel({ name: 'John', email: 'john@example.com' });

			model.set('name', 'Jane');

			expect(model.changed).toEqual({ name: 'Jane' });
			expect(model.hasChanged()).toBe(true);
			expect(model.hasChanged('name')).toBe(true);
			expect(model.hasChanged('email')).toBe(false);
		});

		it('should track previous values before change', () => {
			const model = new TestModel({ name: 'John', email: 'john@example.com', age: 25 });

			model.set('name', 'Jane');

			expect(model.previous).toEqual({ name: 'John' });
			expect(model.changed).toEqual({ name: 'Jane' });
		});

		it('should track multiple changed attributes', () => {
			const model = new TestModel({ name: 'John', email: 'john@example.com', age: 25 });

			model.set({ name: 'Jane', age: 30 });

			expect(model.changed).toEqual({ name: 'Jane', age: 30 });
			expect(model.previous).toEqual({ name: 'John', age: 25 });
			expect(model.hasChanged()).toBe(true);
			expect(model.hasChanged('name')).toBe(true);
			expect(model.hasChanged('age')).toBe(true);
			expect(model.hasChanged('email')).toBe(false);
		});

		it('should reset changed and previous on each set() call', () => {
			const model = new TestModel({ name: 'John', email: 'john@example.com', age: 25 });

			// First set
			model.set('name', 'Jane');
			expect(model.changed).toEqual({ name: 'Jane' });
			expect(model.previous).toEqual({ name: 'John' });

			// Second set - should reset changed and previous
			model.set('email', 'jane@example.com');
			expect(model.changed).toEqual({ email: 'jane@example.com' });
			expect(model.previous).toEqual({ email: 'john@example.com' });
			expect(model.hasChanged('name')).toBe(false);
			expect(model.hasChanged('email')).toBe(true);
		});

		it('should handle setting new attributes that did not exist before', () => {
			const model = new TestModel({ name: 'John' });

			model.set('email', 'john@example.com');

			expect(model.changed).toEqual({ email: 'john@example.com' });
			expect(model.previous).toEqual({});
			expect(model.hasChanged('email')).toBe(true);
		});

		it('should return false for hasChanged() when no changes made', () => {
			const model = new TestModel({ name: 'John', email: 'john@example.com' });

			expect(model.hasChanged()).toBe(false);
			expect(model.hasChanged('name')).toBe(false);
			expect(model.hasChanged('email')).toBe(false);
			expect(model.changed).toEqual({});
			expect(model.previous).toEqual({});
		});

		it('should track changes correctly with single attribute set syntax', () => {
			const model = new TestModel({ name: 'John', email: 'john@example.com', age: 25 });

			model.set('age', 30);

			expect(model.changed).toEqual({ age: 30 });
			expect(model.previous).toEqual({ age: 25 });
			expect(model.hasChanged('age')).toBe(true);
			expect(model.hasChanged('name')).toBe(false);
		});

		it('should handle validation failure without updating changed/previous', () => {
			class User extends Model<TestSchema> {
				endpoint() {
					return '/users';
				}

				validate(attr: Partial<TestSchema>) {
					if (attr.age && attr.age < 18) {
						return 'Must be an adult';
					}
				}
			}

			const user = new User({ email: 'test@example.com', age: 25 });

			// Try to set invalid age with validation
			const result = user.set({ age: 15 }, { validate: true });

			expect(result).toBe(false);
			expect(user.hasChanged()).toBe(false);
			expect(user.changed).toEqual({});
			expect(user.previous).toEqual({});
			expect(user.get('age')).toBe(25); // Age should not have changed
		});

		it('should track changes when setting the same attribute to a different value', () => {
			const model = new TestModel({ name: 'John' });

			model.set('name', 'Jane');
			expect(model.changed).toEqual({ name: 'Jane' });
			expect(model.previous).toEqual({ name: 'John' });

			model.set('name', 'Bob');
			expect(model.changed).toEqual({ name: 'Bob' });
			expect(model.previous).toEqual({ name: 'Jane' });
		});

		it('should handle empty object set without changing anything', () => {
			const model = new TestModel({ name: 'John', email: 'john@example.com' });

			model.set({});

			expect(model.changed).toEqual({});
			expect(model.previous).toEqual({});
			expect(model.hasChanged()).toBe(false);
		});

		it('should provide access to changed/previous objects', () => {
			const model = new TestModel({ name: 'John', email: 'john@example.com' });

			model.set('name', 'Jane');

			const changed = model.changed;
			const previous = model.previous;

			// Verify getters return the expected values
			expect(changed).toEqual({ name: 'Jane' });
			expect(previous).toEqual({ name: 'John' });

			// New set call should update both
			model.set('email', 'jane@example.com');
			expect(model.changed).toEqual({ email: 'jane@example.com' });
			expect(model.previous).toEqual({ email: 'john@example.com' });
		});
	});

	describe('Validation', () => {
		class User extends Model<TestSchema> {
			endpoint() {
				return '/users';
			}

			validate(attr: Partial<TestSchema>) {
				if (attr.age && attr.age < 18) {
					return 'Must be an adult';
				}

				if (!attr.email || attr.email === '') {
					return 'Must provide an email';
				}

				if (!attr.email.includes('@')) {
					return 'Email must be valid';
				}
			}
		}

		it('should validate a user', () => {
			const user = new User({ email: 'testing@testing.tst', age: 25 });
			expect(user.validationError).toBeUndefined();
			expect(user.isValid()).toBe(true);
		});

		it('should fail to set property when validate is true and data is invalid', () => {
			const age = 25;
			const user = new User({ email: 'testing@testing.tst', age });
			const result = user.set({ age: 15 }, { validate: true });

			expect(result).toBe(false);
			// Attribute should NOT have changed
			expect(user.get('age')).toBe(age);
			expect(user.validationError).toBeInstanceOf(ValidationError);
			expect(user.validationError?.message).toBe('Must be an adult');
		});

		it('should allow set() when validate is false even if data is invalid', () => {
			const age = 15;
			const user = new User({ email: 'testing@testing.tst' });
			const result = user.set({ age });
			expect(result).toBe(true);
			expect(user.get('age')).toBe(age);
			expect(user.validationError).toBeUndefined();
		});

		it('should abort save() if validation fails', async () => {
			const user = new User({ email: 'testing@testing.tst' });
			user.set({ email: 'invalid' }); // Valid set (no validate flag)

			// Mock sync to ensure it's never called
			const syncSpy = vi.spyOn(user, 'sync');

			const success = await user.save();

			expect(success).toBe(false);
			expect(syncSpy).not.toHaveBeenCalled();
			expect(user.validationError).toBeInstanceOf(ValidationError);
			expect(user.validationError?.message).toBe('Email must be valid');
		});

		it('should clear validationError on a subsequent valid set()', () => {
			const user = new User({ email: 'testing@testing.tst' });
			let result = user.set({ age: 10 }, { validate: true });
			expect(result).toBe(false);
			expect(user.validationError).toBeInstanceOf(ValidationError);
			expect(user.validationError?.message).toBe('Must be an adult');

			result = user.set({ age: 20 }, { validate: true });
			expect(result).toBe(true);
			expect(user.validationError).toBeUndefined();
		});
	});

	describe('Clone', () => {
		it('should create a new instance with identical attributes except ID', () => {
			const original = new TestModel({ name: 'John', email: 'john@example.com', age: 25 });
			const cloned = original.clone();

			expect(cloned).toBeInstanceOf(TestModel);
			expect(cloned).not.toBe(original);
			expect(cloned.get('name')).toBe('John');
			expect(cloned.get('email')).toBe('john@example.com');
			expect(cloned.get('age')).toBe(25);
		});

		it('should create independent instances', () => {
			const original = new TestModel({ name: 'John', email: 'john@example.com' });
			const cloned = original.clone();

			// Modify the clone
			cloned.set('name', 'Jane');

			// Original should be unchanged
			expect(original.get('name')).toBe('John');
			expect(cloned.get('name')).toBe('Jane');
		});

		it('should remove ID from cloned instance', () => {
			const original = new TestModel({ _id: '123', name: 'John', email: 'john@example.com' });
			const cloned = original.clone();

			expect(original.get('_id')).toBe('123');
			expect(cloned.get('_id')).toBeUndefined();
			expect(cloned.get('name')).toBe('John');
			expect(cloned.get('email')).toBe('john@example.com');
			expect(original.isNew()).toBe(false);
			expect(cloned.isNew()).toBe(true);
		});

		it('should not share changed/previous state', () => {
			const original = new TestModel({ name: 'John', email: 'john@example.com' });
			original.set('name', 'Jane');

			const cloned = original.clone();

			// Clone should have fresh state with no changes tracked
			expect(cloned.hasChanged()).toBe(false);
			expect(cloned.changed).toEqual({});
			expect(cloned.previous).toEqual({});
		});

		it('should work with custom model subclasses', () => {
			class User extends Model<TestSchema> {
				endpoint() {
					return '/users';
				}

				defaults() {
					return { name: 'Default User' };
				}
			}

			const original = new User({ name: 'John', email: 'john@example.com' });
			const cloned = original.clone();

			expect(cloned).toBeInstanceOf(User);
			expect(cloned.get('name')).toBe('John');
			expect(cloned.get('email')).toBe('john@example.com');
		});

		it('should clone empty model', () => {
			const original = new TestModel();
			const cloned = original.clone();

			expect(cloned).toBeInstanceOf(TestModel);
			expect(cloned).not.toBe(original);
			expect(cloned.isNew()).toBe(true);
		});

		it('should work with custom ID attributes', () => {
			class User extends Model<{ uniqueid?: string; name: string }> {
				idAttribute = 'uniqueid';
				endpoint() {
					return '/users';
				}
			}

			const original = new User({ uniqueid: '123', name: 'John' });
			const cloned = original.clone();

			expect(original.get('uniqueid')).toBe('123');
			expect(cloned.get('uniqueid')).toBeUndefined();
			expect(cloned.get('name')).toBe('John');
			expect(original.isNew()).toBe(false);
			expect(cloned.isNew()).toBe(true);
		});
	});

	describe('Persistence', () => {
		it('should save a new document', async () => {
			const mockResponse = { _id: '123', name: 'New Item' };

			fetchMock.mockResolvedValue({
				ok: true,
				status: 201,
				json: async () => mockResponse
			});

			const model = new TestModel({ name: mockResponse.name });
			await model.save();

			expect(fetchMock).toHaveBeenCalledWith(
				'https://api.example.com/test',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ name: mockResponse.name })
				})
			);
			expect(model.get('_id')).toBe(mockResponse._id);
		});

		it('should updated the document', async () => {
			const mockResponse = { _id: '123', name: 'Updated Item' };

			fetchMock.mockResolvedValue({
				ok: true,
				status: 201,
				json: async () => mockResponse
			});

			const model = new TestModel(mockResponse);
			await model.save();

			expect(fetchMock).toHaveBeenCalledWith(
				`https://api.example.com/test/${mockResponse._id}`,
				expect.objectContaining({
					method: 'PUT',
					body: JSON.stringify(mockResponse),
					headers: {
						'Content-Type': 'application/json'
					}
				})
			);
			expect(model.get('_id')).toBe(mockResponse._id);
		});

		it('should retrieve the model', async () => {
			const mockResponse = { _id: '123', name: 'Some Item' };

			fetchMock.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => mockResponse
			});

			const model = new TestModel({ _id: mockResponse._id });
			await model.fetch();

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining(mockResponse._id),
				expect.objectContaining({ method: 'GET' })
			);
		});

		it('should destroy the model', async () => {
			const mockResponse = { _id: '123', name: 'New Item' };

			fetchMock.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => mockResponse
			});

			const model = new TestModel(mockResponse);
			await model.destroy();

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/123'),
				expect.objectContaining({ method: 'DELETE' })
			);
		});

		it('should handle 204 No Content for destroy()', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				status: 204
			});

			const model = new TestModel({ _id: '123', name: 'Delete Me' });
			await model.destroy();

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/123'),
				expect.objectContaining({ method: 'DELETE' })
			);
		});
	});
});
