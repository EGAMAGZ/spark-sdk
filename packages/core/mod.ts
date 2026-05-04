/**
 * @module @spark-sdk/core
 *
 * Core library for interacting with SharePoint lists from client-side code.
 *
 * ## Purpose
 *
 * This package provides a type-safe, fluent API for performing CRUD operations on SharePoint
 * lists using the SharePoint JavaScript Object Model (JSOM). It abstracts away the complexity
 * of CAML queries, context initialization, and field mapping so developers can work with
 * familiar TypeScript patterns.
 *
 * ## What it does
 *
 * 1. **List configuration** — Define list schemas with `SPListBuilder`, mapping friendly
 *    field names (e.g. `description`) to actual SharePoint column names (e.g. `Description`).
 *    Includes validation via `validateListConfig` and `InvalidListConfigError`.
 * 2. **SharePoint client** — A singleton `SharePointClient` that handles initialization,
 *    context management, and provides methods:
 *    - `create()` — Add new list items.
 *    - `read()` — Query items with CAML-based filters, field selection, ordering, and row limits.
 *    - `search()` — Shorthand for field-specific searches with operators like `Eq`, `Contains`,
 *      `BeginsWith`, `Gt`, `IsNull`, etc.
 *    - `getById()` — Fetch a single item by its ID.
 *    - `update()` — Modify existing items.
 *    - `delete()` — Remove items from a list.
 * 3. **Type safety** — Generic types (`SPListConfig`, `SPFields`, `SPResponse`) propagate
 *    your list schema through all operations, giving autocomplete on field names and
 *    compile-time checks.
 *
 * ## Example
 *
 * ```ts
 * import { SharePointClient, SPListBuilder } from '@spark-sdk/core';
 *
 * // 1. Define your list schema
 * const tasks = SPListBuilder.create('Tasks', {
 *   description: 'Description',
 *   status: 'Status',
 *   dueDate: 'DueDate',
 *   assignee: 'Assignee',
 * });
 *
 * // 2. Initialize the client
 * const client = SharePointClient.getInstance();
 * await client.initialize();
 *
 * // 3. Create an item
 * await client.create(tasks, {
 *   title: 'Review Q2 report',
 *   description: 'Review and approve the quarterly report',
 *   status: 'Pending',
 *   dueDate: '2026-06-01',
 * });
 *
 * // 4. Search for pending tasks
 * const pending = await client.search(tasks, 'status', 'Pending', 'Eq', ['title', 'dueDate']);
 * if (pending.success) {
 *   console.log(`Found ${pending.data.length} pending tasks`);
 *
 *   // 5. Update and delete
 *   const first = pending.data[0];
 *   await client.update(tasks, first.id as number, { status: 'Completed' });
 *   await client.delete(tasks, first.id as number);
 * }
 * ```
 */

export * from './src/list-config.ts';
export * from './src/exceptions.ts';
export * from './src/sharepoint-client.ts';
