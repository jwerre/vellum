import { type Mock, describe, it, expect, vi, beforeEach } from 'vitest';
import { configureVellum, Model } from '../lib/index.js';

interface TestSchema {
	id?: string;
	name: string;
	email?: string;
}

class TestModel extends Model<TestSchema> {
	endpoint() {
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

	it('should instantiate a model', async () => {
		const data = { name: 'New Item' };
		const email = 'test@example.com';
		const model = new TestModel(data);
		expect(model.isNew()).toBe(true);
		model.set({ email: email });
		expect(model.get('email')).toBe(email);
	});

	it('should parse model attributes', async () => {
		const data = { id: '123', name: 'Some Item' };
		const model = new TestModel(data);
		expect(model.toJSON()).toStrictEqual(data);
	});

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
