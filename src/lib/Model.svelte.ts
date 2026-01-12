import { type VellumConfig, vellumConfig } from './config.svelte';

export interface SyncOptions extends Partial<VellumConfig> {
	endpoint?: string;
}

export abstract class Model<T extends object> {
	#attributes = $state<T>({} as T);

	/**
	 * Abstract method that must be implemented by subclasses to define the base URL path
	 * for API endpoints related to this model.
	 *
	 * This method returns the root URL segment that will be appended to the base API URL
	 * to form complete endpoints for CRUD operations. For example, if endpoint() returns
	 * '/users', the full URL for API calls would be `${baseUrl}/users` for collections
	 * or `${baseUrl}/users/{id}` for individual resources.
	 *
	 * @returns {string} The root URL path for this model's API endpoints (e.g., '/users', '/posts')
	 * @example
	 * // In a User model subclass:
	 * endpoint(): string {
	 *   return '/users';
	 * }
	 */
	abstract endpoint(): string;

	constructor(data: Partial<T> = {}) {
		this.#attributes = { ...data } as T;
	}

	/**
	 * Internal helper to find the ID
	 */
	#getId(): string | number | undefined {
		// Cast to Record<string, unknown> to allow string indexing
		const attrs = this.#attributes as Record<string, unknown>;
		const id = attrs['id'] ?? attrs['_id'];

		if (typeof id === 'string' || typeof id === 'number') {
			return id;
		}
		return undefined;
	}

	/**
	 * Retrieves the value of a specific attribute from the model.
	 *
	 * This method provides type-safe access to model attributes, ensuring that the
	 * returned value matches the expected type for the given key. It acts as a
	 * getter for the internal attributes stored in the model instance.
	 *
	 * @template K - The key type, constrained to keys of T
	 * @param {K} key - The attribute key to retrieve the value for
	 * @returns {T[K]} The value associated with the specified key
	 * @example
	 * // Assuming a User model with attributes { id: number, name: string }
	 * const user = new User({ id: 1, name: 'John Doe' });
	 * const name = user.get('name'); // Returns 'John Doe' (string)
	 * const id = user.get('id');     // Returns 1 (number)
	 */
	get<K extends keyof T>(key: K): T[K] {
		return this.#attributes[key];
	}

	/**
	 * Sets multiple attributes on the model instance.
	 *
	 * This method allows for bulk updating of model attributes by merging the provided
	 * partial attributes object with the existing attributes. The method performs a
	 * shallow merge, meaning that only the top-level properties specified in the attrs
	 * parameter will be updated, while other existing attributes remain unchanged.
	 *
	 * @param {Partial<T>} attrs - A partial object containing the attributes to update
	 * @returns {void}
	 * @example
	 * // Assuming a User model with attributes { id: number, name: string, email: string }
	 * const user = new User({ id: 1, name: 'John', email: 'john@example.com' });
	 *
	 * // Update multiple attributes at once
	 * user.set({ name: 'Jane', email: 'jane@example.com' });
	 * // Now user has { id: 1, name: 'Jane', email: 'jane@example.com' }
	 *
	 * // Update a single attribute
	 * user.set({ name: 'Bob' });
	 * // Now user has { id: 1, name: 'Bob', email: 'jane@example.com' }
	 */
	set(attrs: Partial<T>): void {
		Object.assign(this.#attributes, attrs);
	}

	/**
	 * Determines whether this model instance is new (not yet persisted).
	 * A model is considered new if it doesn't have an 'id' or '_id' attribute.
	 *
	 * @returns {boolean} true if the model is new, false if it has been persisted
	 */
	isNew(): boolean {
		return !this.#getId();
	}

	/**
	 * Performs HTTP synchronization with the server for CRUD operations.
	 *
	 * This method handles all HTTP communication between the model and the server,
	 * automatically constructing the appropriate URL based on the model's ID and
	 * endpoint(). It supports all standard REST operations and provides type-safe
	 * response handling.
	 *
	 * The URL construction follows REST conventions:
	 * - For new models (no ID): uses collection endpoint `${baseUrl}${endpoint()}`
	 * - For existing models (with ID): uses resource endpoint `${baseUrl}${endpoint()}/${id}`
	 *
	 * @template R - The expected response type, defaults to T (the model's attribute type)
	 * @param {('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')} [method='GET'] - The HTTP method to use (defaults to 'GET')
	 * @param {Record<string, unknown> | T} [body] - Optional request body data to send
	 * @returns {Promise<R | null>} The server response data, or null for 204 No Content responses
	 * @throws {Error} Throws an error if the HTTP response is not successful
	 *
	 * @example
	 * // Fetch a user by ID (default 'GET' request)
	 * const userData = await user.sync();
	 *
	 * // Create a new user (POST request)
	 * const newUser = await user.sync('POST', { name: 'John', email: 'john@example.com' });
	 *
	 * // Update an existing user (PUT request)
	 * const updatedUser = await user.sync('PUT', user.toJSON());
	 *
	 * // Delete a user (DELETE request)
	 * await user.sync('DELETE'); // Returns null for 204 responses
	 */
	async sync<R = T>(
		method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
		body?: Record<string, unknown> | T,
		options: SyncOptions = {}
	): Promise<R | null> {
		const id = this.#getId();
		const endpoint = options?.endpoint?.length ? options.endpoint : this.endpoint();
		const fullUrl = `${vellumConfig.origin}${endpoint}`;
		const url = id ? `${fullUrl}/${id}` : fullUrl;
		const fetchOpts = {
			method,
			headers: {
				...vellumConfig.headers,
				...options?.headers
			},
			body: body ? JSON.stringify(body) : undefined
		};

		// console.log('Model::sync()', url, fetchOpts);

		const response = await fetch(url, fetchOpts);

		if (!response.ok) {
			throw new Error(`Vellum Sync Error: ${response.statusText}`);
		}

		// Handle 204 No Content safely
		if (response.status === 204) {
			return null;
		}

		const data = await response.json();
		return data as R;
	}

	/**
	 * Fetches data from the server and updates the model's attributes.
	 *
	 * This method performs a GET request to retrieve the latest data for this model
	 * instance from the server. If the model has an ID, it will fetch the specific
	 * resource; if it's a new model without an ID, it will make a request to the
	 * collection endpoint.
	 *
	 * Upon successful retrieval, the model's attributes are automatically updated
	 * with the server response data. This method is useful for refreshing a model's
	 * state or loading data after creating a model instance with just an ID.
	 *
	 * @returns {Promise<void>} A promise that resolves when the fetch operation completes
	 * @throws {Error} Throws an error if the HTTP request fails or server returns an error
	 *
	 * @example
	 * // Fetch data for an existing user
	 * const user = new User({ id: 1 });
	 * await user.fetch(); // Model now contains full user data from server
	 *
	 * // Refresh a model's data
	 * await existingUser.fetch(); // Updates with latest server data
	 */
	async fetch(): Promise<void> {
		const data = await this.sync('GET');
		if (data && typeof data === 'object') {
			this.set(data as Partial<T>);
		}
	}

	/**
	 * Saves the model to the server by creating a new resource or updating an existing one.
	 *
	 * This method automatically determines whether to create or update based on the model's
	 * state. If the model is new (has no ID), it performs a POST request to create a new
	 * resource. If the model already exists (has an ID), it performs a PUT request to
	 * update the existing resource.
	 *
	 * After a successful save operation, the model's attributes are updated with any
	 * data returned from the server. This is particularly useful when the server
	 * generates additional fields (like timestamps, computed values, or normalized data)
	 * during the save process.
	 *
	 * @returns {Promise<void>} A promise that resolves when the save operation completes
	 * @throws {Error} Throws an error if the HTTP request fails or server returns an error
	 *
	 * @example
	 * // Create a new user
	 * const newUser = new User({ name: 'John', email: 'john@example.com' });
	 * await newUser.save(); // POST request, user now has ID from server
	 *
	 * // Update an existing user
	 * existingUser.set({ name: 'Jane' });
	 * await existingUser.save(); // PUT request with updated data
	 */
	async save(): Promise<void> {
		const id = this.#getId();
		const method = id ? 'PUT' : 'POST';
		const data = await this.sync(method, this.toJSON());
		if (data && typeof data === 'object') {
			this.set(data as Partial<T>);
		}
	}

	/**
	 * Deletes the model from the server.
	 *
	 * This method performs a DELETE request to remove the model's corresponding resource
	 * from the server. The method only executes if the model has an ID (i.e., it exists
	 * on the server). If the model is new and has no ID, the method will return without
	 * performing any operation.
	 *
	 * The DELETE request is sent to the model's specific resource endpoint using the
	 * pattern `${baseUrl}${endpoint()}/${id}`. After successful deletion, the model
	 * instance remains in memory but the corresponding server resource is removed.
	 *
	 * @returns {Promise<void>} A promise that resolves when the delete operation completes
	 * @throws {Error} Throws an error if the HTTP request fails or server returns an error
	 *
	 * @example
	 * // Delete an existing user
	 * const user = new User({ id: 1, name: 'John' });
	 * await user.destroy(); // DELETE request to /users/1
	 *
	 * // Attempting to destroy a new model (no operation performed)
	 * const newUser = new User({ name: 'Jane' }); // No ID
	 * await newUser.destroy(); // Returns immediately, no HTTP request
	 */
	async destroy(): Promise<void> {
		const id = this.#getId();
		if (id) {
			await this.sync('DELETE');
		}
	}

	/**
	 * Returns a plain JavaScript object representation of the model's attributes.
	 *
	 * This method creates a shallow copy of the model's internal attributes, returning
	 * them as a plain object. This is useful for serialization, debugging, or when you
	 * need to pass the model's data to functions that expect plain objects rather than
	 * model instances.
	 *
	 * The returned object is a copy, so modifications to it will not affect the original
	 * model's attributes. This method is commonly used internally by other model methods
	 * (like save()) when preparing data for HTTP requests.
	 *
	 * @returns {T} A plain object containing all of the model's attributes
	 *
	 * @example
	 * // Get plain object representation
	 * const user = new User({ id: 1, name: 'John', email: 'john@example.com' });
	 * const userData = user.toJSON();
	 * // Returns: { id: 1, name: 'John', email: 'john@example.com' }
	 *
	 * // Useful for serialization
	 * const jsonString = JSON.stringify(user.toJSON());
	 */
	toJSON(): T {
		return { ...this.#attributes };
	}
}
