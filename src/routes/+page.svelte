<script lang="ts">
	import { onMount } from 'svelte';
	import { configureVellum } from '$lib/index.js';
	import { type User, UserModel, UserCollection } from './demo-models.svelte.ts';

	let { data }: { data: { users: User[] } } = $props();

	// Initialize the reactive collection with server data
	const users = $derived(new UserCollection(data.users));
	let userDetails = $state<UserModel | undefined | null>();

	onMount(() => {
		// Configure Vellum for client-side interactions
		configureVellum({
			origin: window.location.origin
		});
	});

	async function onUserDetailsClose(e: Event) {
		e.preventDefault();
		userDetails = null;
	}

	async function onUserDetails(e: Event) {
		e.preventDefault();
		const target = e.target as HTMLButtonElement;
		const tr = target.closest('tr');
		const id = tr?.dataset.id;
		if (!id) return;
		userDetails = users.find({ id });
	}

	async function onUserAdd(e: Event) {
		e.preventDefault();
		await users.addUser();
	}

	async function onUserUpdate(e: Event) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);

		const id = formData.get('id')?.toString();
		const data = {
			name: formData.get('name')?.toString(),
			email: formData.get('email')?.toString()
		};

		if (!id || !Object.keys(data).length) return;
		await users.updateUser(id, data);
		userDetails = null; // close user details
	}

	async function onUserDelete(e: Event) {
		e.preventDefault();
		const target = e.target as HTMLButtonElement;
		const tr = target.closest('tr');
		const id = tr?.dataset.id;
		if (!id) return;
		await users.deleteUser(id);
	}
</script>

<h1>Vellum</h1>
<p>
	Vellum is a lightweight, structural state management library for Svelte 5. Powered by Svelte
	runes, it provides a robust foundation for models and collections. Vellum bridges the gap between
	raw objects and complex state logic, offering a typed, class-based approach to managing data-heavy
	applications.
</p>

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
</ul>

<h2>Example</h2>
<h3>User management</h3>

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
			<tr data-id={user.get('id')}>
				<td>{user.get('id')}</td>
				<td><strong>{user.get('name')}</strong></td>
				<td>{user.get('email')}</td>
				<td>{new Date(user.get('created')).toLocaleString('en-US')}</td>
				<td>
					<nav>
						<button onclick={onUserDetails}>Details</button>
						<button class="delete" onclick={onUserDelete}>Delete</button>
					</nav>
				</td>
			</tr>
		{/each}
	</tbody>
	<tfoot>
		<tr>
			<td colspan="3">
				<button onclick={onUserAdd}>Add random user</button>
			</td>
			<td colspan="2">
				<p>Total users: {users.length}</p>
			</td>
		</tr>
	</tfoot>
</table>

{#if userDetails}
	<div id="user-details">
		<button class="close-button" onclick={onUserDetailsClose}>×</button>
		<h3>User: {userDetails.get('id')}</h3>
		<form onsubmit={onUserUpdate}>
			<input type="hidden" name="id" value={userDetails.get('id')} />
			<ul>
				<li>
					<label for="user-name">Name</label>:
					<input id="user-name" name="name" value={userDetails.get('name')} />
				</li>
				<li>
					<label for="user-email">Email</label>:
					<input id="user-email" name="email" value={userDetails.get('email')} />
				</li>
				<li>
					<button type="submit" id="user-details-submit-btn">Update</button>
				</li>
			</ul>
		</form>
	</div>
{/if}

<style>
	:global(body) {
		--font-size-sm: 0.875rem;
		--font-size-base: 1rem;
		--font-size-lg: 1.5rem;

		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		line-height: 1.6;
		font-size: var(--font-size-base);
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
		font-size: var(--font-size-lg);
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
		font-size: var(--font-size-sm);
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

	nav {
		display: flex;
		gap: 0.5rem;
	}

	button {
		background-color: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: var(--font-size-sm);
		font-weight: 500;
		transition: background-color 0.2s;
	}

	button:hover {
		background-color: #2563eb;
	}

	button.delete {
		background-color: #ef4444;
	}

	button.delete:hover {
		background-color: #dc2626;
	}

	tfoot p {
		margin: 1rem 0 0 0;
		font-weight: 600;
		color: #64748b;
	}

	#user-details {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		border-radius: 8px;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		padding: 2rem;
		min-width: 300px;
		max-width: 500px;
		z-index: 1000;
		border: 1px solid #e2e8f0;
	}

	#user-details::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
	}

	#user-details h3 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: #1e293b;
		font-size: 1.25rem;
		font-weight: 600;
	}

	#user-details ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	#user-details li {
		padding: 0.5rem 0;
		border-bottom: 1px solid #f1f5f9;
	}

	#user-details li:last-child {
		border-bottom: none;
	}

	#user-details button.close-button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
	}

	#user-details button.close-button:hover {
		color: #1e293b;
	}
</style>
