// Collection.svelte.ts
import { Model } from './Model.svelte';

export abstract class Collection<
	M extends Model<T>,
	T extends Record<string, any>,
> {
	items = $state<M[]>([]);

	abstract model: new (data: T) => M;
	abstract url(): string;

	constructor(models: T[] = []) {
		if (models.length > 0) this.reset(models);
	}

	/**
	 * Fetch the entire collection from the server.
	 */
	async fetch(options: { search?: Record<string, any> } = {}): Promise<void> {
		let query = '';
		if (options.search) {
			query = '?' + new URLSearchParams(options.search as any).toString();
		}

		const response = await fetch(`${this.url()}${query}`);
		if (!response.ok) throw new Error(response.statusText);

		const data = await response.json();
		this.reset(data);
	}

	reset(data: T[]): void {
		this.items = data.map((attrs) => new this.model(attrs));
	}
}
