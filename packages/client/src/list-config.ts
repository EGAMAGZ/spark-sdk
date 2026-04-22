export type ListFields<TFields extends Record<string, string>> =
  & {
    [K in keyof TFields]: string;
  }
  & { title: "Title" };

export type SPList<TFields extends Record<string, string>> = {
  name: string;
  fields: ListFields<TFields>;
};

export class SPListBuilder {
  /**
   * Configuración personalizada
   * @param listName - Nombre de la lista
   * @param customFields - Campos personalizados
   * @returns Configuración de lista
   * @example
   * ```ts
   * import { SPListBuilder } from "@spark-sdk/client"
   * const taskListConfig = ListConfigFactory.createCustomConfig("Tasks", {
   *   description: "Description",
   *   status: "Status",
   *   dueDate: "DueDate"
   * });
   *
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
