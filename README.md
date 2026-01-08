# Vellum

Vellum is a lightweight, structural state management library for Svelte 5. Inspired by the architectural patterns of Backbone, Vellum provides a robust Model and Collection base powered by Svelte Runes.

It bridges the gap between raw objects and complex state logic, offering a typed, class-based approach to managing data-heavy applications.

## Features

- **Rune-Powered**: Built from the ground up for Svelte 5 $state and $derived.
- **TypeScript First**: Deeply integrated generics for strict type safety across models and collections.
- **Class-Based**: Encapsulate data, validation, and API logic in clean JavaScript classes.
- **Global Config**: Centralized management for base URLs and reactive headers.
- **RESTful Persistence**: Built-in fetch, save, and destroy methods using node-fetch standards.
- **Zero Boilerplate**: No more manual $store subscriptions; just access properties directly.

## Installation

```bash
npm install @jwerre/vellum
```

## Quick Start

### Configuration

Before using your models, you can configure Vellum globally. This is ideal for setting your API base URL and injecting authorization tokens. Because the configuration uses Svelte Runes, updating headers (like a bearer token) will reactively apply to all subsequent API calls.

```ts
import { configureVellum } from '@jwerre/vellum';

configureVellum({
	baseUrl: 'https://api.example.com',
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
	// Computed property using Svelte $derived
	fullName = $derived(`${this.get('firstName')} ${this.get('lastName')}`);

	isAdmin() {
		return this.get('role') === 'admin';
	}
}

const user = new UserModel({ id: 1 });
await user.sync();
console.log(user.fullName); // John Doe
```

### Define a Collection

Manage groups of models with built-in reactivity.

```ts
import { Collection } from '@jwerre/vellum';
import { UserModel } from './UserModel.svelte.js';

export class UserCollection extends Collection<UserModel, UserSchema> {
	model = UserModel;

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
		<li>{user.fullName} ({user.get('role')})</li>
	{/each}
</ul>

<button onclick={addUser}>Add User</button>
```

## Why Vellum?

Modern Svelte development often moves away from stores and toward raw $state objects. While flexible, this can lead to logic being scattered across components.

### Vellum provides:

- **Consistency**: A standard way to define data entities.
- **API Integration**: A natural home for fetch, save, and delete logic.
- **Encapsulation**: Keep your data transformations inside the class, not the UI.

## API Reference

### `Model<T>`

- `constructor(initialData: Partial<T>)`: Initializes the model state.
- `get(key)`: Reactively retrieves a value.
- `set(attributes)`: Updates multiple attributes and triggers reactivity.
- `toJSON()`: Returns a plain object representation of the state.

### `Collection<M, T>`

- `items`: A reactive array of Model instances.
- `add(data)`: Adds a new model to the collection.
- `remove(predicate)`: Removes models based on a search condition.
- `reset(data)`: Replaces the entire collection with new data.
- `toJSON()`: Returns a plain object representation of the state.
