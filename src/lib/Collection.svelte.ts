import { SvelteURLSearchParams } from 'svelte/reactivity';
import { Model } from './Model.svelte';
import { type VellumConfig, vellumConfig } from './config.svelte';

export interface FetchOptions extends Partial<VellumConfig> {
	endpoint?: string;
	search?: Record<string, string | number | boolean>;
}

/**
 * Abstract base class for managing collections of Model instances.
 *
 * Provides a reactive collection that can be populated with data, fetched from a server,
 * and manipulated with type-safe operations. The collection is backed by Svelte's reactivity
 * system for automatic UI updates.
 *
 * @template M - The Model type that extends Model<T>
 * @template T - The data object type that the models represent
 *
 * @example
 * class UserCollection extends Collection<UserModel, User> {
 *   model = UserModel;
 *   endpoint = () => '/api/users';
 * }
 *
 * const users = new UserCollection();
 * await users.fetch(); // Loads users from API
 * users.add({ name: 'John', email: 'john@example.com' }); // Adds new user
 */
export abstract class Collection<M extends Model<T>, T extends object> {
	/** Reactive array of model instances in the collection */
	items = $state<M[]>([]);

	/** The Model class constructor used to create new instances */
	abstract model: { new (data: Partial<T>): M };

	/** Returns the API endpoint URL for this collection */
	abstract endpoint(): string;

	/**
	 * Optional comparator for sorting the collection.
	 *
	 * By default, there is no comparator for a collection. If you define a comparator,
	 * it will be used to sort the collection any time a model is added.
	 *
	 * A comparator can be defined in three ways:
	 *
	 * 1. **sortBy** - Pass a function that takes a single model argument and returns
	 *    a numeric or string value by which the model should be ordered relative to others.
	 *
	 * 2. **sort** - Pass a comparator function that takes two model arguments and returns
	 *    -1 if the first model should come before the second, 0 if they are of the same
	 *    rank, and 1 if the first model should come after.
	 *
	 * 3. **attribute name** - Pass a string indicating the attribute to sort by.
	 *
	 * Note: The implementation depends on the arity of your comparator function to
	 * determine between sortBy (1 argument) and sort (2 arguments) styles, so be
	 * careful if your comparator function is bound.
	 *
	 * @returns A comparator function, string attribute name, or undefined for no sorting
	 *
	 * @example
	 * // Sort by attribute name
	 * comparator = () => 'createdAt';
	 *
	 * @example
	 * // Sort using sortBy (single argument)
	 * comparator = () => (model: UserModel) => model.get('age');
	 *
	 * @example
	 * // Sort using sort comparator (two arguments)
	 * comparator = () => (a: UserModel, b: UserModel) => {
	 *   if (a.get('priority') < b.get('priority')) return -1;
	 *   if (a.get('priority') > b.get('priority')) return 1;
	 *   return 0;
	 * };
	 */
	comparator?(): string | ((model: M) => string | number) | ((a: M, b: M) => number) | undefined;

	/**
	 * Creates a new Collection instance.
	 *
	 * @param models - Optional array of data objects to initialize the collection with
	 *
	 * @example
	 * // Create empty collection
	 * const collection = new UserCollection();
	 *
	 * // Create collection with initial data
	 * const collection = new UserCollection([
	 *   { id: 1, name: 'John' },
	 *   { id: 2, name: 'Jane' }
	 * ]);
	 */
	constructor(models: T[] = []) {
		if (models.length > 0) {
			this.reset(models);
		}
	}

	/** Gets the number of items in the collection */
	get length(): number {
		return this.items.length;
	}

	/**
	 * Adds a new item to the collection.
	 *
	 * @param data - Either raw data of type T or an existing model instance of type M
	 * @returns The model instance that was added to the collection
	 *
	 * @example
	 * // Add raw data
	 * const user = collection.add({ name: 'John', email: 'john@example.com' });
	 *
	 * // Add existing model instance
	 * const existingUser = new UserModel({ name: 'Jane' });
	 * collection.add(existingUser);
	 */
	add(data: T | M): M {
		const instance = data instanceof Model ? (data as M) : new this.model(data as Partial<T>);
		this.items.push(instance);
		this.sort();
		return instance;
	}

	/**
	 * Sorts the collection using the comparator if one is defined.
	 * Called automatically when items are added to the collection.
	 */
	private sort(): void {
		if (!this.comparator) {
			return;
		}

		const comparator = this.comparator();
		if (!comparator) {
			return;
		}

		// String attribute name
		if (typeof comparator === 'string') {
			const attr = comparator as keyof T;
			this.items.sort((a, b) => {
				const aVal = a.get(attr);
				const bVal = b.get(attr);
				if (aVal < bVal) return -1;
				if (aVal > bVal) return 1;
				return 0;
			});
			return;
		}

		// Function comparator - check arity
		if (comparator.length === 1) {
			// sortBy function (single argument)
			const sortByFn = comparator as (model: M) => string | number;
			this.items.sort((a, b) => {
				const aVal = sortByFn(a);
				const bVal = sortByFn(b);
				if (aVal < bVal) return -1;
				if (aVal > bVal) return 1;
				return 0;
			});
		} else {
			// sort function (two arguments)
			const sortFn = comparator as (a: M, b: M) => number;
			this.items.sort(sortFn);
		}
	}

	/**
	 * Resets the collection with new data, replacing all existing items.
	 *
	 * @param data - An array of raw data objects to populate the collection with
	 *
	 * @example
	 * // Reset collection with new user data
	 * collection.reset([
	 *   { id: 1, name: 'John', email: 'john@example.com' },
	 *   { id: 2, name: 'Jane', email: 'jane@example.com' }
	 * ]);
	 */
	reset(data: T[]): void {
		this.items = data.map((attrs) => new this.model(attrs as Partial<T>));
		this.sort();
	}

	/**
	 * Finds the first item in the collection that matches the given query.
	 *
	 * @param query - An object containing key-value pairs to match against items in the collection.
	 *                Only items that match all specified properties will be returned.
	 * @returns The first matching item, or undefined if no match is found.
	 *
	 * @example
	 * // Find a user by ID
	 * const user = collection.find({ id: 123 });
	 *
	 * // Find by multiple properties
	 * const activeAdmin = collection.find({ role: 'admin', status: 'active' });
	 */
	find(query: Partial<T>): M | undefined {
		return this.items.find((item) => {
			return Object.entries(query).every(([key, value]) => {
				return item.get(key as keyof T) === value;
			});
		});
	}

	/**
	 * Fetches data from the server and populates the collection.
	 *
	 * @param options - Configuration options for the fetch request
	 * @param [options.endpoint] - Optional endpoint to use if different than this.endpoint()
	 * @param [options.search] - Optional search parameters to include in the query string.
	 *                        Keys and values will be converted to strings and URL-encoded.
	 *
	 * @throws {Error} Throws an error if the HTTP request fails or returns a non-ok status
	 *
	 * @example
	 * // Fetch all items
	 * await collection.fetch();
	 *
	 * // Fetch with search parameters
	 * await collection.fetch({
	 *   search: { limit: 30, after: 29 }
	 * });
	 */
	async fetch(options: FetchOptions = {}): Promise<void> {
		let query = '';

		if (options.search) {
			const params = new SvelteURLSearchParams();
			for (const [key, value] of Object.entries(options.search)) {
				params.append(key, String(value));
			}
			query = `?${params.toString()}`;
		}

		const endpoint = options?.endpoint?.length ? options.endpoint : this.endpoint();
		const fullUrl = `${vellumConfig.origin}${endpoint}${query}`;
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
