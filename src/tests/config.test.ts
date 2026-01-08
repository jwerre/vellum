import { describe, it, expect, beforeEach } from 'vitest';
import { vellumConfig, configureVellum } from '../lib/index.js';

describe('Vellum Configuration', () => {
	beforeEach(() => {
		// Reset global state before each test
		vellumConfig.baseUrl = '';
		vellumConfig.headers = { 'Content-Type': 'application/json' };
	});

	it('should initialize with default values', () => {
		expect(vellumConfig.baseUrl).toBe('');
		expect(vellumConfig.headers).toEqual({
			'Content-Type': 'application/json'
		});
	});

	it('should update the baseUrl via configureVellum', () => {
		const baseUrl = 'https://api.example.com';
		configureVellum({ baseUrl });
		expect(vellumConfig.baseUrl).toBe(baseUrl);
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
		expect(vellumConfig.baseUrl).toBe('');
		expect(Object.keys(vellumConfig.headers)).toHaveLength(1);
	});
});
