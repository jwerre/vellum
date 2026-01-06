// config.svelte.ts
export interface VellumConfig {
	baseUrl: string;
	headers: Record<string, string>;
}

export const vellumConfig = $state<VellumConfig>({
	baseUrl: '',
	headers: {
		'Content-Type': 'application/json',
	},
});

/**
 * Helper to update global configuration
 */
export const configureVellum = (config: Partial<VellumConfig>) => {
	if (config.baseUrl) vellumConfig.baseUrl = config.baseUrl;
	if (config.headers) {
		vellumConfig.headers = { ...vellumConfig.headers, ...config.headers };
	}
};
