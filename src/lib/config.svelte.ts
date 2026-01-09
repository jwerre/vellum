// config.svelte.ts
export interface VellumConfig {
	origin: string;
	headers: Record<string, string>;
}

export const vellumConfig = $state<VellumConfig>({
	origin: '',
	headers: {
		'Content-Type': 'application/json'
	}
});

/**
 * Helper to update global configuration
 */
export const configureVellum = (config: Partial<VellumConfig>) => {
	if (config.origin) vellumConfig.origin = config.origin;
	if (config.headers) {
		vellumConfig.headers = { ...vellumConfig.headers, ...config.headers };
	}
};
