export interface VellumConfig {
	origin: string;
	headers: Record<string, string>;
}

/**
 * Global reactive state for Vellum configuration. Uses Svelte's $state rune to
 * create a reactive configuration object that automatically triggers updates when modified.
 *
 * @default origin - Empty string (must be configured before use)
 * @default headers - Contains 'Content-Type': 'application/json'
 */
export const vellumConfig = $state<VellumConfig>({
	origin: '',
	headers: {
		'Content-Type': 'application/json'
	}
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
 */
export const configureVellum = (config: Partial<VellumConfig>) => {
	if (config.origin) vellumConfig.origin = config.origin;
	if (config.headers) {
		vellumConfig.headers = { ...vellumConfig.headers, ...config.headers };
	}
};
