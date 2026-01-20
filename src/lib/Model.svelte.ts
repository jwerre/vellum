import { type VellumConfig, vellumConfig } from './config.svelte';
import { ValidationError } from './errors/validation_error.js';
import { escapeHTML } from './utils.js';

// export interface ModelOptions {}

export interface SyncOptions extends Partial<VellumConfig> {
	endpoint?: string;
}

export interface ValidationOptions {
	validate?: boolean;
	silent?: boolean;
	[key: string]: unknown;
}

export interface CloneOptions {
	keepId?: boolean;
	deep?: boolean;
}

/**
 * Abstract base class for creating model instances that interact with RESTful APIs.
 *
 * The Model class provides a structured way to manage data objects with full CRUD
 * (Create, Read, Update, Delete) capabilities. It includes built-in HTTP synchronization,
 * attribute management, and data validation features. This class is designed to work
 * with Svelte's reactivity system using the `$state` rune for automatic UI updates.
 *
 * Key features:
 * - Type-safe attribute access and manipulation
 * - Automatic HTTP synchronization with RESTful APIs
 * - Built-in HTML escaping for XSS prevention
 * - Configurable ID attributes for different database schemas
 * - Reactive attributes that integrate with Svelte's state management
 * - Support for both single attribute and bulk attribute operations
 *
 * @template T - The type definition for the model's attributes, must extend object
 * @abstract This class must be extended by concrete model implementations
 *
 * @example
 * // Define a User model
 * interface UserAttributes {
 *   id?: number;
 *   name: string;
 *   email: string;
 *   createdAt?: Date;
 * }
 *
 * class User extends Model<UserAttributes> {
 *   endpoint() {
 *     return '/users';
 *   }
 *   defaults() {
 *     return { name: '', createdAt: new Date() };
 *   }
 * }
 *
 * // Create and use a model instance
 * const user = new User({ name: 'John Doe', email: 'john@example.com' });
 * await user.save(); // Creates new user on server
 * user.set('name', 'Jane Doe');
 * await user.save(); // Updates existing user
 * await user.destroy(); // Deletes user
 */
export abstract class Model<T extends object> {
	/**
	 * Internal reactive storage for all model attributes.
	 *
	 * This private field uses Svelte's $state rune to create a reactive object that
	 * holds all the model's attribute data. When attributes are modified, this reactivity
	 * ensures that any Svelte components using the model will automatically re-render
	 * to reflect the changes.
	 *
	 * The attributes are initialized as an empty object cast to type T, and are populated
	 * during construction by merging default values with provided data. All attribute
	 * access and modification should go through the public API methods (get, set, has, etc.)
	 * rather than directly accessing this field.
	 *
	 * @private
	 * @type {T}
	 */
	#attributes = $state<T>({} as T);

	/**
	 * Validation error property that gets set when validation fails.
	 * This property contains the error returned by the validate method.
	 */
	#validationError: ValidationError | undefined = $state();

	/**
	 * Internal hash containing all attributes that have changed since the last set call.
	 * This property tracks which attributes have been modified and their new values.
	 */
	#changed: Partial<T> = {};

	/**
	 * Internal hash containing the previous values of attributes before they were changed.
	 * This property stores the original values of attributes from before the last set call.
	 */
	#previous: Partial<T> = {};

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
	protected abstract endpoint(): string;

	/**
	 * The name of the attribute that serves as the unique identifier for this model instance.
	 *
	 * This private field stores the attribute name that will be used to identify the model's
	 * primary key when performing operations like determining if the model is new, constructing
	 * URLs for API requests, and managing model identity. The default value is 'id', but it
	 * can be customized through the ModelOptions parameter in the constructor.
	 *
	 * @protected
	 * @type {string}
	 * @default 'id'
	 * @example
	 * // Default behavior uses 'id' as the identifier
	 * const user = new User({ id: 1, name: 'John' });
	 *
	 * // Custom ID attribute can be specified in constructor options
	 *	class User extends Model<UserSchema> {
	 *		idAttribute = '_id
	 *		endpoint(): string {
	 *			return '/users';
	 *		}
	 *	}
	 * const user = new User({ _id: '507f1f77bcf86cd799439011', name: 'John' });
	 */
	protected idAttribute = vellumConfig.idAttribute;

	/**
	 * Creates a new instance of Model.
	 */
	constructor(data: Partial<T> = {}) {
		// Initialize model attributes with provided data, ensuring type safety
		this.#attributes = { ...this.defaults(), ...data } as T;
	}

	/**
	 * Gets the latest validation error.
	 *
	 * @returns {ValidationError || undefined} An instance of ValidationError if validation failed, otherwise undefined
	 */
	get validationError(): ValidationError | undefined {
		return this.#validationError;
	}

	/**
	 * Gets the hash of attributes that have changed since the last set call.
	 * This is a readonly accessor - the changed object cannot be modified directly.
	 *
	 * @returns {Partial<T>} An object containing all attributes that have changed
	 */
	get changed(): Partial<T> {
		return this.#changed;
	}

	/**
	 * Gets the hash of previous attribute values before they were changed.
	 * This is a readonly accessor - the previous object cannot be modified directly.
	 *
	 * @returns {Partial<T>} An object containing the previous values of changed attributes
	 */
	get previous(): Partial<T> {
		return this.#previous;
	}

	/**
	 * Determines if attributes have changed since the last set call.
	 *
	 * This method checks whether any attributes were modified in the most recent
	 * set operation. When called without arguments, it returns true if any attributes
	 * have changed. When called with a specific attribute key, it returns true only
	 * if that particular attribute was changed.
	 *
	 * @param {keyof T} [attr] - Optional attribute key to check for changes
	 * @returns {boolean} True if attributes have changed, false otherwise
	 *
	 * @example
	 * // Check if any attributes changed
	 * const user = new User({ name: 'John', email: 'john@example.com' });
	 * user.set('name', 'Jane');
	 * user.hasChanged(); // Returns true
	 *
	 * @example
	 * // Check if a specific attribute changed
	 * user.set('name', 'Jane');
	 * user.hasChanged('name'); // Returns true
	 * user.hasChanged('email'); // Returns false
	 */
	hasChanged(attr?: keyof T): boolean {
		if (attr !== undefined) {
			return attr in this.#changed;
		}
		return Object.keys(this.#changed).length > 0;
	}

	/**
	 * Provides default attribute values for new model instances.
	 *
	 * This method is called during model construction to establish initial attribute
	 * values before applying any user-provided data. Subclasses can override this
	 * method to define default values for their specific attributes, ensuring that
	 * models always have sensible initial state.
	 *
	 * The defaults are applied first, then any data passed to the constructor will
	 * override these default values. This allows for flexible model initialization
	 * where some attributes have fallback values while others can be explicitly set.
	 *
	 * @protected
	 * @returns {Partial<T>} A partial object containing default attribute values
	 *
	 * @example
	 * // Override in a User model subclass
	 * protected defaults(): Partial<UserAttributes> {
	 *   return {
	 *     role: 'user',
	 *     isActive: true,
	 *     createdAt: new Date()
	 *   };
	 * }
	 *
	 * @example
	 * // Creating a model with defaults
	 * const user = new User({ name: 'John' });
	 * // Resulting attributes: { role: 'user', isActive: true, createdAt: Date, name: 'John' }
	 */
	protected defaults(): Partial<T> {
		return {};
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
	 * The method supports optional validation through the ValidationOptions parameter.
	 * If validation is enabled and fails, the attributes will not be updated and the
	 * method will return false. The validationError property will be set with details
	 * about the validation failure.
	 *
	 * @overload
	 * @param {K} key - The attribute key to set
	 * @param {T[K]} value - The value to set for the specified key
	 * @param {ValidationOptions} [options] - Optional validation and behavior settings
	 * @param {boolean} [options.validate] - If true, validates attributes before setting them
	 * @param {boolean} [options.silent] - If true, suppresses validation error setting
	 * @returns {boolean} True if attributes were set successfully, false if validation failed
	 *
	 * @overload
	 * @param {Partial<T>} attrs - A partial object containing the attributes to update
	 * @param {ValidationOptions} [options] - Optional validation and behavior settings
	 * @param {boolean} [options.validate] - If true, validates attributes before setting them
	 * @param {boolean} [options.silent] - If true, suppresses validation error setting
	 * @returns {boolean} True if attributes were set successfully, false if validation failed
	 *
	 * @example
	 * // Set a single attribute
	 * user.set('name', 'Jane');
	 *
	 * // Set multiple attributes
	 * user.set({ name: 'Jane', email: 'jane@example.com' });
	 *
	 * // Set with validation enabled
	 * const success = user.set({ email: 'invalid-email' }, { validate: true });
	 * if (!success) {
	 *   console.log('Validation failed:', user.validationError);
	 * }
	 *
	 * // Set attributes silently without validation errors
	 * user.set({ name: '' }, { validate: true, silent: true });
	 */
	set<K extends keyof T>(key: K, value: T[K], options?: ValidationOptions): boolean;
	set(attrs: Partial<T>, options?: ValidationOptions): boolean;
	set<K extends keyof T>(
		keyOrAttrs: K | Partial<T>,
		valueOrOptions?: T[K] | ValidationOptions,
		options?: ValidationOptions
	): boolean {
		let attrs: Partial<T> = {};
		let opts: ValidationOptions | undefined;

		if (typeof keyOrAttrs === 'object') {
			attrs = keyOrAttrs;
			opts = valueOrOptions as ValidationOptions;
		} else {
			attrs[keyOrAttrs as K] = valueOrOptions as T[K];
			opts = options;
		}

		if (opts?.validate && !this.#doValidation({ ...this.#attributes, ...attrs }, opts)) {
			return false;
		}

		// Store previous values and record new changes
		this.#previous = {};
		for (const key in attrs) {
			if (key in this.#attributes) {
				this.#previous[key] = this.#attributes[key];
			}
		}
		this.#changed = attrs;

		Object.assign(this.#attributes, attrs);
		return true;
	}

	/**
	 * Checks whether a specific attribute has a non-null, non-undefined value.
	 *
	 * This method provides a way to determine if an attribute exists and has a
	 * meaningful value. It returns true if the attribute is set to any value
	 * other than null or undefined, including falsy values like false, 0, or
	 * empty strings, which are considered valid values.
	 *
	 * @template K - The key type, constrained to keys of T
	 * @param {K} key - The attribute key to check
	 * @returns {boolean} True if the attribute has a non-null, non-undefined value
	 * @example
	 * // Assuming a User model with attributes { id: number, name: string, email?: string }
	 * const user = new User({ id: 1, name: 'John', email: null });
	 *
	 * user.has('id');    // Returns true (value is 1)
	 * user.has('name');  // Returns true (value is 'John')
	 * user.has('email'); // Returns false (value is null)
	 *
	 * // Even falsy values are considered "set"
	 * user.set({ name: '' });
	 * user.has('name');  // Returns true (empty string is a valid value)
	 */
	has<K extends keyof T>(key: K): boolean {
		const value = this.#attributes[key];
		return value !== null && value !== undefined;
	}

	/**
	 * Removes a specific attribute from the model by deleting it from the internal attributes hash.
	 *
	 * This method permanently removes an attribute from the model instance. Once unset,
	 * the attribute will no longer exist on the model and subsequent calls to get() for
	 * that key will return undefined. This is different from setting an attribute to
	 * null or undefined, as the property is completely removed from the attributes object.
	 *
	 * @template K - The key type, constrained to keys of T
	 * @param {K} key - The attribute key to remove from the model
	 * @returns {void}
	 * @example
	 * // Assuming a User model with attributes { id: number, name: string, email: string }
	 * const user = new User({ id: 1, name: 'John', email: 'john@example.com' });
	 *
	 * user.has('email'); // Returns true
	 * user.unset('email'); // Remove the email attribute
	 * user.has('email'); // Returns false
	 * user.get('email'); // Returns undefined
	 *
	 * // The attribute is completely removed, not just set to undefined
	 * const userData = user.toJSON(); // { id: 1, name: 'John' }
	 */
	unset<K extends keyof T>(key: K): void {
		// Cast to Record to allow delete operation
		const attrs = this.#attributes as Record<string | number | symbol, unknown>;
		delete attrs[key as string | number | symbol];
	}

	/**
	 * Removes all attributes from the model, including the id attribute.
	 *
	 * This method completely clears the model instance by removing all stored attributes,
	 * effectively resetting it to an empty state. After calling clear(), the model will
	 * behave as if it were newly instantiated with no data. This includes removing the
	 * ID attribute, which means the model will be considered "new" after clearing.
	 *
	 * This is useful when you want to reuse a model instance for different data or
	 * reset a model to its initial state without creating a new instance.
	 *
	 * @returns {void}
	 * @example
	 * // Clear all data from a user model
	 * const user = new User({ id: 1, name: 'John', email: 'john@example.com' });
	 * user.clear();
	 *
	 * user.has('id');    // Returns false
	 * user.has('name');  // Returns false
	 * user.isNew();      // Returns true
	 * user.toJSON();     // Returns {}
	 *
	 * // Model can be reused with new data
	 * user.set({ name: 'Jane', email: 'jane@example.com' });
	 */
	clear(): void {
		this.#attributes = {} as T;
	}

	/**
	 * Retrieves and escapes the HTML content of a specific attribute from the model.
	 *
	 * This method provides a safe way to access model attributes that may contain
	 * user-generated content or data that will be rendered in HTML contexts. It
	 * automatically applies HTML escaping to prevent XSS attacks and ensure safe
	 * rendering of potentially dangerous content.
	 *
	 * The method uses the escapeHTML utility function to convert special HTML
	 * characters (such as <, >, &, ", and ') into their corresponding HTML entities,
	 * making the content safe for direct insertion into HTML templates.
	 *
	 * @template K - The key type, constrained to keys of T
	 * @param {K} key - The attribute key to retrieve and escape the value for
	 * @returns {T[K]} The HTML-escaped value associated with the specified key
	 * @example
	 * // Assuming a Post model with attributes { id: number, title: string, content: string }
	 * const post = new Post({
	 *   id: 1,
	 *   title: 'Hello <script>alert("XSS")</script>',
	 *   content: 'This is "safe" & secure content'
	 * });
	 *
	 * const safeTitle = post.escape('title');
	 * // Returns: 'Hello &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
	 *
	 * const safeContent = post.escape('content');
	 * // Returns: 'This is &quot;safe&quot; &amp; secure content'
	 */
	escape<K extends keyof T>(key: K): string {
		const val = this.#attributes[key];
		if (val === undefined || val === null) return '';
		return escapeHTML(val.toString());
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
	 * Validates the current model instance and returns whether it passes validation.
	 *
	 * This method performs validation on the model's current attributes using the
	 * validate() method defined by the subclass. It's a convenience method that
	 * allows you to check if a model is valid without having to manually call
	 * the validation logic.
	 *
	 * If validation fails, the validationError property will be set with details
	 * about what went wrong. If validation passes, validationError will be cleared.
	 *
	 * @param {ValidationOptions} [options] - Optional validation configuration
	 * @param {boolean} [options.silent] - If true, suppresses validation error setting
	 * @returns {boolean} True if the model passes validation, false otherwise
	 *
	 * @example
	 * // Check if a user model is valid
	 * const user = new User({ name: '', email: 'invalid-email' });
	 *
	 * if (!user.isValid()) {
	 *   console.log('Validation failed:', user.validationError);
	 *   // Handle validation errors
	 * } else {
	 *   // Proceed with saving or other operations
	 *   await user.save();
	 * }
	 *
	 * @example
	 * // Validate silently without setting validationError
	 * const isValid = user.isValid({ silent: true });
	 * // user.validationError remains unchanged
	 */
	isValid(options?: ValidationOptions): boolean {
		return this.#doValidation(this.#attributes, { ...options, validate: true });
	}

	/**
	 * Validates the model's attributes using custom validation logic.
	 *
	 * This method is intended to be overridden by subclasses to implement custom
	 * validation rules. By default, it returns undefined (no validation errors).
	 * If validation fails, this method should return an error - either a simple
	 * string message or a complete error object.
	 *
	 * The validate method is automatically called by save() before persisting data,
	 * and can also be explicitly called by set() when the {validate: true} option
	 * is passed. If validation fails, the save operation is aborted and model
	 * attributes are not modified.
	 *
	 * @param {Partial<T>} attributes - The attributes to validate
	 * @param {any} [options] - Additional options passed from set() or save()
	 * @returns {any} Returns undefined if valid, or an error (string/object) if invalid
	 *
	 * @example
	 * // Override in a User model subclass
	 * validate(attributes: Partial<UserAttributes>) {
	 *   if (!attributes.email) {
	 *     return 'Email is required';
	 *   }
	 *   if (!attributes.email.includes('@')) {
	 *     return { email: 'Invalid email format' };
	 *   }
	 *   // Return undefined if validation passes
	 * }
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	validate(attributes: Partial<T>, options?: ValidationOptions): string | undefined {
		// Default implementation - no validation
		return undefined;
	}

	/**
	 * Creates a new instance of the model with identical attributes.
	 *
	 * This method returns a new model instance that is a clone of the current model,
	 * with all attributes copied to the new instance. The clone is a separate object
	 * with its own state, so modifications to the clone will not affect the original
	 * model and vice versa. By default, the ID is removed so the cloned instance is
	 * considered "new" (isNew() returns true).
	 *
	 * @param {CloneOptions} [options] - Configuration options for cloning
	 * @param {boolean} [options.keepId=false] - If true, preserves the ID in the clone
	 * @param {boolean} [options.deep=false] - If true, performs a deep clone of nested objects/arrays
	 * @returns {this} A new instance of the same model class with cloned attributes
	 *
	 * @example
	 * // Clone a user model (default - no ID)
	 * const user = new User({ id: 1, name: 'John', email: 'john@example.com' });
	 * const userCopy = user.clone();
	 * console.log(userCopy.isNew()); // true
	 * console.log(userCopy.get('id')); // undefined
	 *
	 * @example
	 * // Clone with ID preserved
	 * const userCopy = user.clone({ keepId: true });
	 * console.log(userCopy.isNew()); // false
	 * console.log(userCopy.get('id')); // 1
	 *
	 * @example
	 * // Deep clone for nested objects
	 * const user = new User({ id: 1, name: 'John', settings: { theme: 'dark' } });
	 * const userCopy = user.clone({ deep: true });
	 * userCopy.get('settings').theme = 'light';
	 * console.log(user.get('settings').theme); // 'dark' (unchanged)
	 */
	clone(options?: CloneOptions): this {
		const Constructor = this.constructor as new (data: Partial<T>) => this;
		let attrs = this.toJSON();

		// Remove ID unless keepId is true
		if (!options?.keepId) {
			delete attrs[this.idAttribute as keyof T];
		}

		// Perform deep clone if requested
		if (options?.deep) {
			attrs = structuredClone(attrs);
		}

		return new Constructor(attrs);
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
	 * @param {ValidationOptions & SyncOptions} [options] - Optional configuration for save behavior
	 * @param {boolean} [options.validate] - Whether to validate before saving (defaults to true)
	 * @param {boolean} [options.silent] - If true, suppresses validation error setting
	 * @param {string} [options.endpoint] - Override the default endpoint for this save operation
	 * @param {Record<string, string>} [options.headers] - Additional headers to include in the request
	 * @param {string} [options.origin] - Override the base URL origin for this request
	 * @returns {Promise<boolean>} A promise that resolves to true if save succeeds, false if validation fails
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
	 *
	 * // Save without validation
	 * await user.save({ validate: false });
	 *
	 * // Save with custom endpoint and headers
	 * await user.save({
	 *   endpoint: '/api/v2/users',
	 *   headers: { 'Custom-Header': 'value' }
	 * });
	 */
	async save(options?: ValidationOptions & SyncOptions): Promise<boolean> {
		// Always validates before saving unless {validate: false}
		if (options?.validate !== false && !this.#doValidation(this.#attributes, options)) {
			return false;
		}

		const id = this.#getId();
		const method = id ? 'PUT' : 'POST';

		const data = await this.sync(method, this.toJSON(), options);
		if (data && typeof data === 'object') {
			this.set(data as Partial<T>, { silent: true });
		}

		return true;
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

	// --------------- PRIVATE METHODS --------------- //

	#getId(): string | number | undefined {
		const id = this.#attributes[this.idAttribute as keyof T];

		if (typeof id === 'number' || (typeof id === 'string' && id.length > 0)) {
			return id;
		}

		return undefined;
	}

	#doValidation(attrs: Partial<T>, options?: ValidationOptions): boolean {
		if (options?.silent || !this.validate || typeof this.validate !== 'function') {
			this.#validationError = undefined;
			return true;
		}

		const errMsg = this.validate(attrs, options);
		// console.log(errMsg);
		if (errMsg && errMsg.length > 0) {
			this.#validationError = new ValidationError(errMsg);
			return false;
		}

		this.#validationError = undefined;
		return true;
	}
}
