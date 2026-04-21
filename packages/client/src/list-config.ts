export type ListFields<TFields extends Record<string, string>> =
  & {
    [K in keyof TFields]: string;
  }
  & { title: "Title" };

export type ListConfig<TFields extends Record<string, string>> = {
  name: string;
  fields: ListFields<TFields>;
};

export type CustomFields = {
  [column: string]: string;
};

export class ListConfigFactory {
  /**
   * Configuración personalizada
   * @param listName - Nombre de la lista
   * @param customFields - Campos personalizados
   * @returns Configuración de lista
   * @example
   * ```ts
   * import { ListConfigFactory } from "@spark-sdk/client"
   * const taskListConfig = ListConfigFactory.createCustomConfig("Tasks", {
   *   description: "Description",
   *   status: "Status",
   *   dueDate: "DueDate"
   * });
   *
   * ```
   */
  static createCustomConfig<TFields extends Record<string, string>>(
    listName: string,
    customFields: TFields,
  ): ListConfig<TFields> {
    return {
      name: listName,
      fields: {
        title: "Title",
        ...customFields,
      },
    };
  }
}
