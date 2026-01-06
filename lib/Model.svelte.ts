import { vellumConfig } from './config.svelte';

export abstract class Model<T extends Record<string, any>> {
	#attributes = $state<T>({} as T);

	abstract urlRoot(): string;

	constructor(initialData: Partial<T> = {}) {
		this.#attributes = { ...initialData } as T;
	}

	get<K extends keyof T>(key: K): T[K] {
		return this.#attributes[key];
	}

	set(attrs: Partial<T>): void {
		Object.assign(this.#attributes, attrs);
	}

	async sync(method: string, body?: any): Promise<any> {
		const id = this.get('id' as keyof T) || this.get('_id' as keyof T);

		// Combine global baseUrl with local urlRoot
		const fullUrl = `${vellumConfig.baseUrl}${this.urlRoot()}`;
		const url = id ? `${fullUrl}/${id}` : fullUrl;

		const response = await fetch(url, {
			method,
			headers: {
				...vellumConfig.headers, // Merge global headers
			},
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			throw new Error(`Vellum Sync Error: ${response.statusText}`);
		}

		return response.status !== 204 ? await response.json() : null;
	}

	async fetch(): Promise<void> {
		const data = await this.sync('GET');
		if (data) this.set(data);
	}

	async save(): Promise<void> {
		const id = this.get('id' as keyof T) || this.get('_id' as keyof T);
		const method = id ? 'PUT' : 'POST';
		const data = await this.sync(method, this.toJSON());
		if (data) this.set(data);
	}

	async destroy(): Promise<void> {
		const id = this.get('id' as keyof T) || this.get('_id' as keyof T);
		if (id) await this.sync('DELETE');
	}

	toJSON(): T {
		return { ...this.#attributes };
	}
}
