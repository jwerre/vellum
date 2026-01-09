<script lang="ts">
	import { onMount } from 'svelte';
	import { configureVellum } from '$lib/index.js';
	import { type User, UserCollection, UserModel } from './demo-models.svelte.ts';

	const FIRST_NAMES = [
		'Alice',
		'Bob',
		'Charlie',
		'Diana',
		'Edward',
		'Fiona',
		'George',
		'Hannah',
		'Ian',
		'Julia'
	];
	const LAST_NAMES = [
		'Smith',
		'Johnson',
		'Williams',
		'Brown',
		'Jones',
		'Garcia',
		'Miller',
		'Davis',
		'Rodriguez',
		'Martinez'
	];

	let { data }: { data: { users: User[] } } = $props();

	// Initialize the reactive collection with server data
	const users = $derived(new UserCollection(data.users));

	onMount(() => {
		// Configure Vellum for client-side interactions
		configureVellum({
			origin: window.location.origin
		});
	});

	async function addUser() {
		const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
		const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
		const email = `${first.toLowerCase()}.${last.toLowerCase()}@${new Date().getTime()}.com`;
		const newUser = new UserModel({
			name: `${first} ${last}`,
			email: email
		});

		await newUser.save(); // POST to /api/users
		users.add(newUser); // Add to collection
	}

	async function deleteUser(userId: User['id']) {
		if (!userId) return;
		const user = users.items.find((user) => user.get('id') === userId);
		if (user) {
			await user.destroy();
			users.fetch();
		}
	}

	async function deleteUserHandler(e: Event) {
		const target = e.target as HTMLButtonElement;
		if (!target.dataset.id) return;
		await deleteUser(target.dataset.id);
	}
</script>

<h1>Vellum</h1>
<p>
	Vellum is a lightweight, structural state management library for Svelte 5. Inspired by the
	architectural patterns of Backbone, Vellum provides a robust Model and Collection base powered by
	Svelte Runes.
</p>
<p>
	It bridges the gap between raw objects and complex state logic, offering a typed, class-based
	approach to managing data-heavy applications.
</p>
<!--
<h2>Features</h2>
<ul>
	<li><strong>Rune-Powered</strong>: Built from the ground up for Svelte 5 $state and $derived.</li>
	<li>
		<strong>TypeScript First</strong>: Deeply integrated generics for strict type safety across
		models and collections.
	</li>
	<li>
		<strong>Class-Based</strong>: Encapsulate data, validation, and API logic in clean JavaScript
		classes.
	</li>
	<li>
		<strong>Global Config</strong>: Centralized management for base URLs and reactive headers.
	</li>
	<li>
		<strong>RESTful Persistence</strong>: Built-in fetch, save, and destroy methods using node-fetch
		standards.
	</li>
	<li>
		<strong>Zero Boilerplate</strong>: No more manual $store subscriptions; just access properties
		directly.
	</li>
</ul> -->

<h2>Example: User management</h2>

<table>
	<thead>
		<tr>
			<th>ID</th>
			<th>Name</th>
			<th>Email</th>
			<th>Created</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each users.items as user (user.get('id'))}
			<tr>
				<td>{user.get('id')}</td>
				<td><strong>{user.get('name')}</strong></td>
				<td>{user.get('email')}</td>
				<td>{new Date(user.get('created')).toLocaleString('en-US')}</td>
				<td><button data-id={user.get('id')} onclick={deleteUserHandler}>Delete</button></td>
			</tr>
		{/each}
	</tbody>
	<tfoot>
		<tr>
			<td colspan="3">
				<button onclick={addUser}>Add User</button>
			</td>
			<td colspan="2">
				<p>Total Users: {users.length}</p>
			</td>
		</tr>
	</tfoot>
</table>

<style>
	:global(body) {
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		line-height: 1.6;
		margin: 0;
		padding: 2rem;
		background-color: #f8fafc;
		color: #334155;
	}

	h1 {
		color: #1e293b;
		margin-bottom: 1rem;
		font-size: 2.5rem;
		font-weight: 700;
	}

	h2 {
		color: #475569;
		margin: 2rem 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		border-bottom: 2px solid #e2e8f0;
		padding-bottom: 0.5rem;
	}

	p {
		margin-bottom: 1rem;
		max-width: 800px;
	}

	table {
		width: 100%;
		max-width: 900px;
		border-collapse: collapse;
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	th {
		background-color: #64748b;
		color: white;
		font-weight: 600;
		padding: 1rem;
		text-align: left;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	td {
		padding: 1rem;
		border-bottom: 1px solid #e2e8f0;
	}

	tbody tr:hover {
		background-color: #f1f5f9;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tfoot td {
		background-color: #f8fafc;
		border-top: 2px solid #e2e8f0;
		padding: 1.5rem;
	}

	tfoot td:last-child {
		text-align: right;
	}

	button {
		background-color: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	button:hover {
		background-color: #2563eb;
	}

	button[data-id] {
		background-color: #ef4444;
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
	}

	button[data-id]:hover {
		background-color: #dc2626;
	}

	tfoot p {
		margin: 1rem 0 0 0;
		font-weight: 600;
		color: #64748b;
	}
</style>
