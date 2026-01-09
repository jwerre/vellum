# Vellum

Vellum is a lightweight, structural state management library for Svelte 5. Vellum provides a robust Model and Collection base powered by Svelte Runes.It bridges the gap between raw objects and complex state logic, offering a typed, class-based approach to managing data-heavy applications.

## Features

- **Rune-Powered**: Built from the ground up for Svelte 5 `$state` and `$derived`.
- **TypeScript First**: Deeply integrated generics for strict type safety across models and collections.
- **Class-Based**: Encapsulate data, validation, and API logic in clean JavaScript classes.
- **Global Config**: Centralized management for base URLs and reactive headers.
- **RESTful Persistence**: Built-in fetch, save, and destroy methods using node-fetch standards.
- **Zero Boilerplate**: No more manual $store subscriptions; just access properties directly.

## Why Vellum?

Modern Svelte development often moves away from stores and toward raw $state objects. While flexible, this can lead to logic being scattered across components.

### Vellum provides:

- **Consistency**: A standard way to define data entities.
- **API Integration**: A natural home for fetch, save, and delete logic.
- **Encapsulation**: Keep your data transformations inside the class, not the UI.

## Installation

```bash
npm install @jwerre/vellum
```

## Quick Start

### Configuration

Before using your models, you should configure Vellum globally. This is ideal for setting your API base URL and injecting authorization tokens. Because the configuration uses Svelte Runes, updating headers (like a bearer token) will reactively apply to all subsequent API calls.

```ts
import { configureVellum } from '@jwerre/vellum';

configureVellum({
	origin: 'https://api.example.com',
	headers: {
		Authorization: 'Bearer your-token-here'
	}
});
```

### Define a Model

Extend the Model class to define your data structure and any derived state or business logic.

```ts
import { Model } from '@jwerre/vellum';
interface UserSchema {
	id: number;
	firstName: string;
	lastName: string;
	role: 'admin' | 'user';
}

export class UserModel extends Model<UserSchema> {
	endpoint() {
		return `/v1/user`;
	}

	// Computed property using Svelte $derived
	fullName = $derived(`${this.get('firstName')} ${this.get('lastName')}`);

	isAdmin() {
		return this.get('role') === 'admin';
	}
}

const user = new UserModel({ firstName: 'John', lastName: 'Doe', role: 'user' });
await user.sync();
console.log(user.id); // 1
console.log(user.fullName); // John Doe
```

### Define a Collection

Manage groups of models with built-in reactivity.

```ts
import { Collection } from '@jwerre/vellum';
import { UserModel } from './UserModel.svelte.js';

export class UserCollection extends Collection<UserModel, UserSchema> {
	model = UserModel;

	endpoint() {
		return `/v1/users`;
	}

	// Derived state for the entire collection
	adminCount = $derived(this.items.filter((u) => u.isAdmin()).length);
}
```

### Use in Svelte Components

Vellum works seamlessly with Svelte 5 components.

```svelte
<script lang="ts">
	import { UserCollection } from './UserCollection';

	const users = new UserCollection([{ id: 1, firstName: 'Jane', lastName: 'Doe', role: 'admin' }]);

	function addUser() {
		users.add({ id: 2, firstName: 'John', lastName: 'Smith', role: 'user' });
	}
</script>

<h1>Admins: {users.adminCount}</h1>

<ul>
	{#each users.items as user}
		{#if user.isAdmin()}
			<li>{user.fullName} ({user.get('email')})</li>
		{/if}
	{/each}
</ul>

<button onclick={addUser}>Add User</button>
```

## API Reference

### `Model<T>`

The `Model` class provides a base class for creating data models with built-in CRUD operations and server synchronization.

#### Constructor

```javascript
new Model((data = {}));
```

Creates a new Model instance with optional initial attributes.

**Parameters:**

- `data` (Object) - Optional partial object of attributes to initialize the model

#### Abstract Properties

Must be implemented by subclasses:

- `endpoint()` - Function that returns the base URL path for API endpoints (e.g., '/users')

#### Methods

##### get(key)

Retrieves the value of a specific attribute from the model.

**Parameters:**

- `key` - The attribute key to retrieve

**Returns:** The value associated with the specified key

```javascript
const user = new User({ id: 1, name: 'John Doe' });
const name = user.get('name'); // Returns 'John Doe'
```

##### set(attrs)

Updates multiple attributes on the model instance.

**Parameters:**

- `attrs` - Partial object containing attributes to update

```javascript
user.set({ name: 'Jane', email: 'jane@example.com' });
```

##### isNew()

Determines whether this model instance is new (not yet persisted).

**Returns:** `true` if the model has no ID, `false` otherwise

```javascript
const newUser = new User({ name: 'John' });
console.log(newUser.isNew()); // true
```

##### sync(method, body, options)

Performs HTTP synchronization with the server for CRUD operations.

**Parameters:**

- `method` - HTTP method ('GET', 'POST', 'PUT', 'PATCH', 'DELETE'), defaults to 'GET'
- `body` - Optional request body data
- `options` - Optional configuration overrides

**Returns:** Promise resolving to server response data or null

```javascript
// Fetch user data
const userData = await user.sync();

// Create new user
const newUser = await user.sync('POST', { name: 'John' });

// Update user
const updated = await user.sync('PUT', user.toJSON());
```

##### fetch()

Fetches data from the server and updates the model's attributes.

**Returns:** Promise

```javascript
const user = new User({ id: 1 });
await user.fetch(); // Model now contains full user data
```

##### save()

Saves the model by creating (POST) or updating (PUT) the server resource.

**Returns:** Promise

```javascript
// Create new user
const newUser = new User({ name: 'John' });
await newUser.save(); // POST request

// Update existing user
user.set({ name: 'Jane' });
await user.save(); // PUT request
```

##### destroy()

Deletes the model from the server.

**Returns:** Promise

```javascript
await user.destroy(); // DELETE request to /users/1
```

##### toJSON()

Returns a plain object representation of the model's attributes.

**Returns:** Plain object containing all attributes

```javascript
const user = new User({ id: 1, name: 'John' });
const userData = user.toJSON();
// Returns: { id: 1, name: 'John' }
```

#### Example Usage

```javascript
class User extends Model {
	endpoint() {
		return '/users';
	}
}

// Create and save new user
const user = new User({ name: 'John', email: 'john@example.com' });
await user.save();

// Fetch existing user
const existingUser = new User({ id: 1 });
await existingUser.fetch();

// Update user
existingUser.set({ name: 'Jane' });
await existingUser.save();

// Delete user
await existingUser.destroy();
```

### `Collection<M, T>`

The `Collection` class provides a reactive container for managing groups of Model instances with automatic UI updates.

#### Constructor

```javascript
new Collection((models = []));
```

Creates a new Collection instance with optional initial data.

**Parameters:**

- `models` (Array) - Optional array of data objects to initialize the collection

#### Properties

- `items` - Reactive array of model instances in the collection
- `length` - Number of items in the collection (read-only)

#### Abstract Properties

These must be implemented by subclasses:

- `model` - The Model class constructor for creating instances
- `endpoint()` - Function that returns the API endpoint URL

#### Methods

##### add(data)

Adds a new item to the collection.

**Parameters:**

- `data` - Raw data object or existing model instance

**Returns:** The model instance that was added

```javascript
const user = collection.add({ name: 'John', email: 'john@example.com' });
```

##### reset(data)

Replaces all items in the collection with new data.

**Parameters:**

- `data` - Array of raw data objects

```javascript
collection.reset([
	{ id: 1, name: 'John' },
	{ id: 2, name: 'Jane' }
]);
```

##### find(query)

Finds the first item matching the query object.

**Parameters:**

- `query` - Object with key-value pairs to match

**Returns:** The first matching item or `undefined`

```javascript
const user = collection.find({ id: 123 });
const activeAdmin = collection.find({ role: 'admin', status: 'active' });
```

##### fetch(options)

Fetches data from the server and populates the collection.

**Parameters:**

- `options.search` - Optional search parameters for the query string

**Returns:** Promise

```javascript
// Fetch all items
await collection.fetch();

// Fetch with search parameters
await collection.fetch({
	search: { limit: 30, after: 29 }
});
```
