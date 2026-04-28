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

type ValidationResult =
  | { isValid: false; errorMessage: string }
  | { isValid: true; errorMessage?: never };

/**
 * Valida la configuración de una lista
 * @param list - Configuración de la lista a validar
 * @returns Indica si la configuración es válida y un mensaje de error si no lo es
 * @example
 * ```ts
 * import { SPListBuilder, validateSPList } from "@spark-sdk/core";
 * const myList = SPListBuilder.create("My List", { customField: "CustomField" });
 * const validation = validateSPList(myList);
 * if (!validation.isValid) {
 *   console.error(validation.errorMessage);
 * }
 * ```
 */
export function validateListConfig<TFields extends Record<string, string>>(
  list: SPList<TFields>,
): ValidationResult {
  if (!list.name || typeof list.name !== "string") {
    return {
      isValid: false,
      errorMessage: "ListConfig.name es requerido y debe ser un string",
    };
  }

  if (!list.fields || typeof list.fields !== "object") {
    return {
      isValid: false,
      errorMessage: "ListConfig.fields es requerido y debe ser un objeto",
    };
  }

  if (!list.fields.title) {
    return {
      isValid: false,
      errorMessage: "ListConfig.fields.title es requerido",
    };
  }

  return {
    isValid: true,
  };
}
