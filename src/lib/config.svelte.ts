import { request } from './utils.js';

export type VellumRequest = (
	url: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: string;
	}
) => Promise<unknown>;

export interface VellumConfig {
	origin: string;
	headers: Record<string, string>;
	idAttribute: string;
	request: VellumRequest;
}

/**
 * Global reactive state for Vellum configuration. Uses Svelte's $state rune to
 * create a reactive configuration object that automatically triggers updates when modified.
 *
 * @default origin - Empty string (must be configured before use)
 * @default headers - Contains 'Content-Type': 'application/json'
 * @default idAttribute - The default unique identifier attribute for models
 * @default request - The request function that uses fetch to make HTTP requests (default: fetch)
 */
export const vellumConfig = $state<VellumConfig>({
	origin: '',
	headers: {
		'Content-Type': 'application/json'
	},
	idAttribute: 'id',
	request
});

/**
 * Helper function to update global Vellum configuration
 *
 * Allows partial updates to the global configuration state. Only provided
 * properties will be updated, leaving others unchanged. Headers are merged
 * with existing headers rather than replaced entirely.
 *
 * @param {Partial<VellumConfig>} config - Partial configuration object with properties to update
 * @param {string} [config.origin] - New origin URL to set
 * @param {Record<string, string>} [config.headers] - Headers to merge with existing headers
 * @param {string} [config.idAttribute="id"] - The default unique identifier attribute for models
 * @param {function} [config.request=fetch] - Vellum leverages the Fetch API via Model::sync and Collection::fetch. To use a different network interface or add custom wrappers, simply provide your own request function implementation.
 *
 * @example
 * // Set the API origin
 * configureVellum({ origin: 'https://api.vellum.ai' });
 *
 * // Add custom headers
 * configureVellum({
 *   headers: {
 *     'Authorization': 'Bearer token123',
 *     'X-Custom-Header': 'value'
 *   }
 * });
 *
 * // Update both origin and headers
 * configureVellum({
 *   origin: 'https://api.vellum.ai',
 *   headers: { 'Authorization': 'Bearer token123' }
 * });
 *
 * @example
 * // Provide a custom request function
 * import { type AxiosRequestConfig }, axios from 'axios';
 *
 * const customRequest: VellumRequest = async (url: string, options: AxiosRequestConfig) => {
 *   const response = await axios({
 *     url,
 *     ...options,
 *     headers: {
 *       ...options.headers,
 *     }
 *   });
 *
 *   if (response.status === 204) {
 *     return null;
 *   }
 *
 *   return response.data;
 * };
 *
 * configureVellum({
 *   request: customRequest
 * });
 */
export const configureVellum = (config: Partial<VellumConfig>) => {
	if (config.origin?.length) {
		vellumConfig.origin = config.origin;
	}

	if (config.idAttribute?.length) {
		vellumConfig.idAttribute = config.idAttribute;
	}

	if (config.headers) {
		vellumConfig.headers = { ...vellumConfig.headers, ...config.headers };
	}

	if (config.request) {
		vellumConfig.request = config.request;
	}
};
