import { describe, it, expect, beforeEach } from 'vitest';
import { vellumConfig, configureVellum } from '../lib/index.js';

describe('Vellum Configuration', () => {
	beforeEach(() => {
		// Reset global state before each test
		vellumConfig.origin = '';
		vellumConfig.headers = { 'Content-Type': 'application/json' };
		vellumConfig.idAttribute = 'id';
	});

	it('should initialize with default values', () => {
		expect(vellumConfig.origin).toBe('');
		expect(vellumConfig.headers).toEqual({
			'Content-Type': 'application/json'
		});
		expect(vellumConfig.idAttribute).toBe('id');
	});

	it('should update the origin via configureVellum', () => {
		const origin = 'https://api.example.com';
		configureVellum({ origin });
		expect(vellumConfig.origin).toBe(origin);
	});

	it('should merge headers rather than overwriting them', () => {
		configureVellum({
			headers: { Authorization: 'Bearer token-123' }
		});

		expect(vellumConfig.headers).toEqual({
			'Content-Type': 'application/json',
			Authorization: 'Bearer token-123'
		});
	});

	it('should overwrite existing header keys with new values', () => {
		configureVellum({
			headers: { 'Content-Type': 'application/xml' }
		});

		expect(vellumConfig.headers['Content-Type']).toBe('application/xml');
	});

	it('should not update properties if they are missing from config object', () => {
		configureVellum({});
		expect(vellumConfig.origin).toBe('');
		expect(Object.keys(vellumConfig.headers)).toHaveLength(1);
		expect(vellumConfig.idAttribute).toBe('id');
	});

	it('should update the idAttribute via configureVellum', () => {
		const idAttribute = 'data-id';
		configureVellum({ idAttribute });
		expect(vellumConfig.idAttribute).toBe(idAttribute);
	});

	it('should not allow setting idAttribute to undefined', () => {
		configureVellum({ idAttribute: undefined });
		expect(vellumConfig.idAttribute).toBe('id');
	});

	it('should update multiple properties at once including idAttribute', () => {
		configureVellum({
			origin: 'https://api.example.com',
			headers: { Authorization: 'Bearer token-456' },
			idAttribute: 'custom-id'
		});

		expect(vellumConfig.origin).toBe('https://api.example.com');
		expect(vellumConfig.headers).toEqual({
			'Content-Type': 'application/json',
			Authorization: 'Bearer token-456'
		});
		expect(vellumConfig.idAttribute).toBe('custom-id');
	});
});
