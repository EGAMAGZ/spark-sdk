/**
 * Represents the fields of a SharePoint list.
 * @typeParam TFields - Custom fields extending Record<string, string>
 */
export type SPListConfigFields<TFields extends Record<string, unknown>> =
  & {
    [K in keyof TFields]: string;
  }
  & { title: 'Title' };

/**
 * Configuration object for a SharePoint list.
 * @typeParam TFields - Custom fields extending Record<string, string>
 * @example
 * ```ts
 * import { type SPListConfig } from "@spark-sdk/core"
 * const taskListConfig: SPListConfig<{description: string; status: string;}> = {
 *   name: "Tasks",
 *   fields: {
 *     title: "Title",
 *     description: "Description",
 *     status: "Status"
 *   }
 * };
 * ```
 */
export type SPListConfig<TFields extends Record<string, string>> = {
  /** The name of the SharePoint list */
  name: string;
  /** The fields configured for the list */
  fields: SPListConfigFields<TFields>;
};

/**
 * Represents the values stored in a SharePoint list item for a task list.
 *
 * This type derives its keys from `SPListConfig.fields` and provides
 * autocompletion for each field defined in the list configuration.
 *
 * @typeParam TFields - The field mapping object from `SPListConfig.fields`
 *
 * @example
 * ```ts
 * import { type SPFields } from "@spark-sdk/core";
 *
 * const taskListConfig = {
 *   title: "Title",
 *   description: "Description",
 *   status: "Status",
 *   due: "Due",
 *   completed: "Completed",
 *   tags: "Tags",
 * } as const;
 *
 * type TaskFields = SPFields<typeof taskListConfig>;
 *
 * const taskFields: TaskFields = {
 *   title: "Nueva tarea",
 *   description: "Descripción de la nueva tarea",
 *   status: "In Progress",
 *   due: "2026-05-02T12:00:00.000Z",
 *   completed: false,
 *   tags: ["marketing", "publicidad"],
 * };
 * ```
 */
export type SPFields<TFields extends Record<string, string>> = {
  [K in keyof SPListConfigFields<TFields>]:
    | string
    | number
    | boolean
    | string[]
    | null
    | undefined;
};

/**
 * Builder class for creating SharePoint list configurations.
 * Provides a fluent API to construct SPList objects with custom fields.
 * @example
 * ```ts
 * import { SPListBuilder } from "@spark-sdk/core"
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
   * import { SPListBuilder } from "@spark-sdk/core";
   * const myList = SPListBuilder.create("My List", {
   *   customField1: "Field1",
   *   customField2: "Field2"
   * });
   * ```
   */
  static create<TFields extends Record<string, string>>(
    listName: string,
    customFields: TFields,
  ): SPListConfig<TFields> {
    return {
      name: listName,
      fields: {
        title: 'Title',
        ...customFields,
      },
    };
  }
}

type ValidationResult =
  | { isValid: false; errorMessage: string }
  | { isValid: true; errorMessage?: never };

/**
 * Valida la configuración de una lista
 * @param list - Configuración de la lista a validar
 * @returns Indica si la configuración es válida y un mensaje de error si no lo es
 * @example
 * ```ts
 * import { SPListBuilder, validateListConfig } from "@spark-sdk/core";
 * const myList = SPListBuilder.create("My List", { customField: "CustomField" });
 * const validation = validateListConfig(myList);
 * if (!validation.isValid) {
 *   console.error(validation.errorMessage);
 * }
 * ```
 */
export function validateListConfig<TFields extends Record<string, string>>(
  list: SPListConfig<TFields>,
): ValidationResult {
  if (!list.name || typeof list.name !== 'string') {
    return {
      isValid: false,
      errorMessage: 'ListConfig.name es requerido y debe ser un string',
    };
  }

  if (!list.fields || typeof list.fields !== 'object') {
    return {
      isValid: false,
      errorMessage: 'ListConfig.fields es requerido y debe ser un objeto',
    };
  }

  if (!list.fields.title) {
    return {
      isValid: false,
      errorMessage: 'ListConfig.fields.title es requerido',
    };
  }

  return {
    isValid: true,
  };
}
