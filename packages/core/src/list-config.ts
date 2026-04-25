/**
 * Represents the fields of a SharePoint list.
 * @typeParam TFields - Custom fields extending Record<string, string>
 */
export type ListFields<TFields extends Record<string, string>> =
  & {
    [K in keyof TFields]: string;
  }
  & { title: "Title" };

/**
 * Configuration object for a SharePoint list.
 * @typeParam TFields - Custom fields extending Record<string, string>
 */
export type SPList<TFields extends Record<string, string>> = {
  /** The name of the SharePoint list */
  name: string;
  /** The fields configured for the list */
  fields: ListFields<TFields>;
};

/**
 * Builder class for creating SharePoint list configurations.
 * Provides a fluent API to construct SPList objects with custom fields.
 * @example
 * ```ts
 * import { SPListBuilder } from "@spark-sdk/client"
 *
 * const taskListConfig = SPListBuilder.create("Tasks", {
 *   description: "Description",
 *   status: "Status",
 *   dueDate: "DueDate"
 * });
 * // Result: { name: "Tasks", fields: { title: "Title", description: "Description", status: "Status", dueDate: "DueDate" } }
 * ```
 */
export class SPListBuilder {
  /**
   * Creates a new SharePoint list configuration.
   * @param listName - The name of the SharePoint list
   * @param customFields - Additional custom fields to include (besides the required Title field)
   * @returns A new SPList configuration object
   * @example
   * ```ts
   * import { SPListBuilder } from "@spark-sdk/client";
   * const myList = SPListBuilder.create("My List", {
   *   customField1: "Field1",
   *   customField2: "Field2"
   * });
   * ```
   */
  static create<TFields extends Record<string, string>>(
    listName: string,
    customFields: TFields,
  ): SPList<TFields> {
    return {
      name: listName,
      fields: {
        title: "Title",
        ...customFields,
      },
    };
  }
}
