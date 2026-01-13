import { type Mock, describe, it, expect, vi, beforeEach } from 'vitest';
import { configureVellum, Model, ValidationError } from '../lib/index.js';

interface TestSchema {
	id?: string;
	name: string;
	email?: string;
	age?: number;
}

class TestModel extends Model<TestSchema> {
	// idAttribute = '_id';
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
			origin: 'https://api.example.com'
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
			const model = new TestModel({ id: '123', name: 'Some Item', email: 'test@example.com' });
			model.clear();
			expect(model.get('id')).toBeUndefined();
			expect(model.get('name')).toBeUndefined();
			expect(model.get('email')).toBeUndefined();
			expect(model.toJSON()).toStrictEqual({});
		});

		it('should check if a model is new or not', async () => {
			const data = { name: 'New model' };
			const model = new TestModel(data);
			expect(model.isNew()).toBe(true);
			model.set('id', '123');
			expect(model.isNew()).toBe(false);
		});

		it('should parse model attributes', async () => {
			const data = { id: '123', name: 'Some Item' };
			const model = new TestModel(data);
			expect(model.toJSON()).toStrictEqual(data);
		});

		it('should apply an alternative id attribute', () => {
			class User extends Model<{ _id?: string }> {
				idAttribute = '_id';
				endpoint() {
					return '/users';
				}
			}

			const user = new User();
			expect(user.idAttribute).toBe('_id');
			expect(user.isNew()).toBe(true);
			user.set('_id', '6966b9497bac517184d7151');
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

	describe('Persistence', () => {
		it('should save a new document', async () => {
			const mockResponse = { id: '123', name: 'New Item' };

			// Use the typed mock reference instead of 'as any'
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
			expect(model.get('id')).toBe(mockResponse.id);
		});

		it('should updated the document', async () => {
			const mockResponse = { id: '123', name: 'Updated Item' };

			// Use the typed mock reference instead of 'as any'
			fetchMock.mockResolvedValue({
				ok: true,
				status: 201,
				json: async () => mockResponse
			});

			const model = new TestModel(mockResponse);
			await model.save();

			expect(fetchMock).toHaveBeenCalledWith(
				`https://api.example.com/test/${mockResponse.id}`,
				expect.objectContaining({
					method: 'PUT',
					body: JSON.stringify(mockResponse),
					headers: {
						'Content-Type': 'application/json'
					}
				})
			);
			expect(model.get('id')).toBe(mockResponse.id);
		});

		it('should retrieve the model', async () => {
			const mockResponse = { id: '123', name: 'Some Item' };

			fetchMock.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => mockResponse
			});

			const model = new TestModel({ id: mockResponse.id });
			await model.fetch();

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining(mockResponse.id),
				expect.objectContaining({ method: 'GET' })
			);
		});

		it('should destroy the model', async () => {
			const mockResponse = { id: '123', name: 'New Item' };

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

			const model = new TestModel({ id: '123', name: 'Delete Me' });
			await model.destroy();

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/123'),
				expect.objectContaining({ method: 'DELETE' })
			);
		});
	});
});
