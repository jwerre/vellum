import { SvelteURLSearchParams } from 'svelte/reactivity';
import { Model } from './Model.svelte';
import { vellumConfig } from './config.svelte';

export abstract class Collection<M extends Model<T>, T extends object> {
	items = $state<M[]>([]);

	abstract model: new (data: Partial<T>) => M;
	abstract url(): string;

	constructor(models: T[] = []) {
		if (models.length > 0) {
			this.reset(models);
		}
	}

	get length(): number {
		return this.items.length;
	}

	add(data: T | M): M {
		const instance = data instanceof Model ? (data as M) : new this.model(data as Partial<T>);
		this.items.push(instance);
		return instance;
	}

	reset(data: T[]): void {
		this.items = data.map((attrs) => new this.model(attrs as Partial<T>));
	}

	/**
	 * Fetches data from the server and populates the collection.
	 *
	 * @param options - Configuration options for the fetch request
	 * @param options.search - Optional search parameters to include in the query string.
	 *                        Keys and values will be converted to strings and URL-encoded.
	 *
	 * @throws {Error} Throws an error if the HTTP request fails or returns a non-ok status
	 *
	 * @example
	 * ```typescript
	 * // Fetch all items
	 * await collection.fetch();
	 *
	 * // Fetch with search parameters
	 * await collection.fetch({
	 *   search: {
	 *     name: 'John',
	 *     active: true,
	 *     age: 25
	 *   }
	 * });
	 * ```
	 */
	async fetch(options: { search?: Record<string, string | number | boolean> } = {}): Promise<void> {
		let query = '';

		if (options.search) {
			const params = new SvelteURLSearchParams();
			for (const [key, value] of Object.entries(options.search)) {
				params.append(key, String(value));
			}
			query = `?${params.toString()}`;
		}

		const fullUrl = `${vellumConfig.baseUrl}${this.url()}${query}`;
		const response = await fetch(fullUrl, {
			headers: { ...vellumConfig.headers }
		});

		if (!response.ok) {
			throw new Error(`Vellum Collection Error: ${response.statusText}`);
		}

		const data = (await response.json()) as T[];
		this.reset(data);
	}
}
