import { validateListConfig } from "./list-config.ts";
import { TTY } from "./tty.ts";
import { InvalidListConfigError } from "./exceptions.ts";

/**
 * Default headers for SharePoint API requests.
 */
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json;odata=verbose",
};

interface SharePointClientOptions {
  enableLogging?: boolean;
}

export class SharePointClient {
  tty!: TTY;
  static _instance: SharePointClient | null = null;

  options: SharePointClientOptions = {
    enableLogging: true,
  };
  isInitialized: boolean = false;
  initializationPromise: Promise<SharePointClient> | null = null;

  constructor() {
    if (SharePointClient._instance) {
      return SharePointClient._instance;
    }
    this.context = null;
    this.site = null;
    this.web = null;
    this.user = null;

    this.tty = new TTY({
      enabled: this.options.enableLogging,
    });

    SharePointClient._instance = this;
    this.tty.log("SharePointClient Singleton created");
  }

  /**
   * Gets the singleton instance
   * @returns Unique instance
   * @example
   * ```ts
   * import { SharePointClient } from "@spark-sdk/core";
   * const client = SharePointClient.getInstance();
   * ```
   */
  static getInstance(): SharePointClient {
    if (!SharePointClient._instance) {
      SharePointClient._instance = new SharePointClient();
    }
    return SharePointClient._instance;
  }

  /**
   * Sets global client options
   * @param newOptions - New options
   * @example
   * ```ts
   * import { SharePointClient } from "@spark-sdk/core";
   * const client = SharePointClient.getInstance();
   * client.setOptions({
   *   enableLogging: false,
   * });
   * ```
   */
  setOptions(newOptions: SharePointClientOptions) {
    this.options = { ...this.options, ...newOptions };
    this.tty.log("Options updated", this.options);
  }
  /**
   * Initializes the SharePoint client
   * @returns Promise that resolves with the initialized instance
   * @example
   * ```ts
   * import { SharePointClient } from "@spark-sdk/core";
   * const client = SharePointClient.getInstance();
   * try {
   *   await client.initialize();
   *   console.log("Client initialized");
   * } catch (error) {
   *   console.error("Initialization failed", error);
   * }
   * ```
   */
  initialize(): Promise<SharePointClient> | SharePointClient {
    if (this.isInitialized) {
      return this;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  /**
   * Performs the actual initialization
   */
  private async _performInitialization() {
    try {
      this.tty.log("Initializing SharePoint context...");

      const contextData = await this._initializeSharePointContext();

      this.context = contextData.current;
      this.site = contextData.site;
      this.web = contextData.web;
      this.user = contextData.user;
      this.isInitialized = true;

      this.tty.log("SharePoint Client initialized successfully", {
        user: this.user?.LoginName,
      });

      return this;
    } catch (error) {
      this.tty.logError("Error during initialization", error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Ensures the client is initialized
   */
  private async _ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Initializes the SharePoint context
   */
  private _initializeSharePointContext() {
    return new Promise((resolve, reject) => {
      if (typeof SP === "undefined" || !SP.SOD) {
        reject(
          new Error("SharePoint JavaScript libraries are not available"),
        );
        return;
      }

      SP.SOD.executeFunc("sp.js", "SP.ClientContext", async () => {
        try {
          const context = SP.ClientContext.get_current();
          const site = context.get_site();
          const web = context.get_web();
          context.load(web);

          const onSuccess = async () => {
            try {
              const url = web.get_url();
              const user = await this._getUserData(url);

              if (!user) {
                throw new Error("Failed to retrieve user data");
              }

              resolve({ current: context, site, web, user });
            } catch (error) {
              this.tty.logError("Error getting user data", error);
              reject(error);
            }
          };

          const onFailure = (_sender, args) => {
            const error = new Error(
              `SharePoint context query failed: ${args.get_message()}`,
            );
            this.tty.logError("Context query failed", error);
            reject(error);
          };

          context.executeQueryAsync(onSuccess, onFailure);
        } catch (error) {
          this.tty.logError("Error in executeFunc", error);
          reject(error);
        }
      });
    });
  }

  /**
   * Fetches current user data
   * @param baseUrl - Base URL of the SharePoint site
   */
  private async _getUserData(baseUrl: string) {
    const url = new URL(baseUrl);
    url.pathname += "/_api/web/currentUser";

    try {
      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch user data: ${response.status} ${response.statusText}`,
        );
      }

      const body = await response.json();
      return body.d;
    } catch (err) {
      this.tty.logError("Error fetching user data", err);
      return null;
    }
  }

  /**
   * Processes field values for read/write operations
   */
  private _processFieldValue(value, isReading = false) {
    if (value === null || value === undefined) {
      return null;
    }

    // If reading and the value has SP special properties
    if (isReading && typeof value === "object") {
      // User/Person field
      if (value.get_lookupValue) {
        return value.get_lookupValue();
      }

      // Date field
      if (value instanceof Date) {
        return value.toISOString();
      }
    }

    return value;
  }

  /**
   * Builds a CAML query
   */
  private _buildCamlQuery(options, listConfig) {
    const camlQuery = new SP.CamlQuery();
    let queryXml = "<View>";

    if (options.fields && options.fields.length > 0) {
      queryXml += "<ViewFields>";

      queryXml += `<FieldRef Name="ID" />`;

      if (!options.fields || options.fields.includes("title")) {
        queryXml += `<FieldRef Name="Title" />`;
      }

      options.fields.forEach((field) => {
        if (field !== "title") {
          const sharePointFieldName = listConfig.fields[field] || field;
          queryXml += `<FieldRef Name="${sharePointFieldName}" />`;
        }
      });
      queryXml += "</ViewFields>";
    }

    if (options.filter || options.orderBy) {
      queryXml += "<Query>";

      if (options.filter) {
        queryXml += `<Where>${options.filter}</Where>`;
      }

      if (options.orderBy) {
        queryXml += "<OrderBy>";
        const sharePointFieldName = listConfig.fields[options.orderBy.field] ||
          options.orderBy.field;
        queryXml += `<FieldRef Name="${sharePointFieldName}" Ascending="${
          options.orderBy.ascending !== false
        }" />`;
        queryXml += "</OrderBy>";
      }

      queryXml += "</Query>";
    }

    if (options.rowLimit) {
      queryXml += `<RowLimit>${options.rowLimit}</RowLimit>`;
    }

    queryXml += "</View>";

    this.tty.log("QueryXML:", queryXml);
    camlQuery.set_viewXml(queryXml);
    return camlQuery;
  }

  /**
   * Processes item data
   */
  private _processItemData(item, listConfig, requestedFields = null) {
    const itemData = {
      id: item.get_id(),
    };

    const fieldsToProcess = requestedFields || Object.keys(listConfig.fields);

    if (!requestedFields || requestedFields.includes("title")) {
      itemData.title = item.get_item("Title");
    }

    fieldsToProcess.forEach((key) => {
      if (key !== "title" && listConfig.fields[key]) {
        try {
          const fieldValue = item.get_item(listConfig.fields[key]);
          itemData[key] = this._processFieldValue(fieldValue, true);
        } catch (error) {
          this.tty.log(
            `Field '${key}' (${listConfig.fields[key]}) not available in item`,
            error.message,
          );
        }
      }
    });

    return itemData;
  }

  /**
   * Gets current user information
   * @returns {Object} - User information
   * @example
   * ```ts
   * import { SharePointClient } from "@spark-sdk/core";
   * const client = SharePointClient.getInstance();
   * await client.initialize();
   * const { user } = client.userInfo;
   * console.log(user);
   * ```
   */
  get userInfo() {
    return {
      user: this.user,
    };
  }

  /**
   * Creates a new item in the specified list
   * @param {Object} listConfig - List configuration
   * @param {Object} itemData - Item data to create
   * @returns {Promise<Object>} - Operation result
   * @example
   * ```ts
   * import { SharePointClient } from "@spark-sdk/core";
   * const client = SharePointClient.getInstance();
   * const taskListConfig = SPListBuilder.create("Tasks", {
   *   description: "Description",
   *   status: "Status"
   * });
   *
   * const newItem = {
   *   title: "New Task",
   *   description: "Description of the new task",
   *   status: "Pending"
   * };
   *
   * try {
   *   const result = await client.create(taskListConfig, newItem);
   *   console.log("Item created:", result);
   * } catch (error) {
   *   console.error("Error creating item:", error);
   * }
   * ```
   */
  async create(listConfig, itemData) {
    await this._ensureInitialized();

    const validatedConfig = validateListConfig(listConfig);
    if (!validatedConfig.isValid) {
      throw new InvalidListConfigError(
        validatedConfig.errorMessage,
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const list = this.web.get_lists().getByTitle(listConfig.name);
        const listItemCreationInfo = new SP.ListItemCreationInformation();
        const newItem = list.addItem(listItemCreationInfo);

        Object.keys(itemData).forEach((key) => {
          if (listConfig.fields[key]) {
            const fieldValue = this._processFieldValue(itemData[key]);
            newItem.set_item(listConfig.fields[key], fieldValue);
          }
        });

        newItem.update();

        this.context.load(newItem);

        this.context.executeQueryAsync(
          () => {
            const itemData = this._processItemData(newItem, listConfig);
            const result = {
              success: true,
              data: itemData,
              listName: listConfig.name,
              message: "Item created successfully",
            };

            this.tty.log(`Item created in ${listConfig.name}`, result);
            resolve(result);
          },
          (_sender, args) => {
            const error = {
              success: false,
              error: args.get_message(),
              details: args.get_stackTrace(),
              listName: listConfig.name,
            };

            this.tty.logError(
              `Error creating item in ${listConfig.name}`,
              error,
            );
            reject(error);
          },
        );
      } catch (error) {
        this.tty.logError("Error in create method", error);
        reject({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Reads items from the current or specified list
   * @param {Object} listConfig - List configuration
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Found items
   * @example
   * ```ts
   * import { SharePointClient } from "@spark-sdk/core";
   * const client = SharePointClient.getInstance();
   * const taskListConfig = SPListBuilder.create("Tasks", {
   *   description: "Description",
   *   status: "Status"
   * });
   *
   * // Read all items
   * const allItems = await client.read(taskListConfig);
   *
   * // Read with options
   * const options = {
   *   fields: ["title", "status"],
   *   filter: `<Eq><FieldRef Name='Status' /><Value Type='Text'>Pending</Value></Eq>`,
   *   orderBy: { field: "Title", ascending: true },
   *   rowLimit: 10
   * };
   * const filteredItems = await client.read(taskListConfig, options);
   * console.log(filteredItems);
   * ```
   */
  async read(listConfig, options = {}) {
    await this._ensureInitialized();

    const validatedConfig = validateListConfig(listConfig);
    if (!validatedConfig.isValid) {
      throw new InvalidListConfigError(
        validatedConfig.errorMessage,
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const list = this.web.get_lists().getByTitle(listConfig.name);
        const camlQuery = this._buildCamlQuery(options, listConfig);
        const items = list.getItems(camlQuery);
        this.context.load(items);

        this.context.executeQueryAsync(
          () => {
            const itemsArray = [];
            const enumerator = items.getEnumerator();

            while (enumerator.moveNext()) {
              const item = enumerator.get_current();
              const itemData = this._processItemData(
                item,
                listConfig,
                options.fields,
              );
              itemsArray.push(itemData);
            }

            const result = {
              success: true,
              items: itemsArray,
              count: itemsArray.length,
              listName: listConfig.name,
            };

            this.tty.log(
              `Retrieved ${itemsArray.length} items from ${listConfig.name}`,
            );
            resolve(result);
          },
          (_sender, args) => {
            const error = {
              success: false,
              error: args.get_message(),
              details: args.get_stackTrace(),
              listName: listConfig.name,
            };

            this.tty.logError(
              `Error reading items from ${listConfig.name}`,
              error,
            );
            reject(error);
          },
        );
      } catch (error) {
        this.tty.logError("Error in read method", error);
        reject({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Searches items by specific field using CAML operators
   * @param {Object} listConfig - List configuration
   * @param {string} fieldName - Field name (use config key, e.g., "placa")
   * @param {string|number|boolean|Date} searchValue - Value to search
   * @param {string} operator - CAML comparison operator (default: "Contains")
   * @param {string[]} fields - List of fields to use
   * @returns {Promise<Object>} - Found items
   *
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * const autoListConfig = SPListBuilder.create("Auto", {
   *   placa: "Placa",
   *   marca: "Marca",
   *   modelo: "Modelo",
   *   activo: "Activo",
   *   fecha: "FechaRegistro"
   * });
   *
   * // ========== COMPARISON OPERATORS ==========
   *
   * // 1. Eq (Equal to)
   * const exactMatch = await client.search(autoListConfig, "placa", "ABC123", "Eq");
   * // Generated CAML: <Eq><FieldRef Name="Placa" /><Value Type="Text">ABC123</Value></Eq>
   *
   * // 2. Neq (Not equal to)
   * const notEqual = await client.search(autoListConfig, "marca", "Toyota", "Neq");
   * // Generated CAML: <Neq><FieldRef Name="Marca" /><Value Type="Text">Toyota</Value></Neq>
   *
   * // 3. Contains (Partial search)
   * const contains = await client.search(autoListConfig, "placa", "ABC", "Contains");
   * // Generated CAML: <Contains><FieldRef Name="Placa" /><Value Type="Text">ABC</Value></Contains>
   *
   * // 4. BeginsWith (Starts with)
   * const startsWith = await client.search(autoListConfig, "placa", "ABC", "BeginsWith");
   * // Generated CAML: <BeginsWith><FieldRef Name="Placa" /><Value Type="Text">ABC</Value></BeginsWith>
   *
   * // ========== NUMERIC OPERATORS ==========
   *
   * // 5. Gt (Greater than)
   * const greaterThan = await client.search(autoListConfig, "id", 100, "Gt");
   * // Generated CAML: <Gt><FieldRef Name="ID" /><Value Type="Number">100</Value></Gt>
   *
   * // 6. Geq (Greater or equal than)
   * const greaterOrEqual = await client.search(autoListConfig, "id", 100, "Geq");
   * // Generated CAML: <Geq><FieldRef Name="ID" /><Value Type="Number">100</Value></Geq>
   *
   * // 7. Lt (Less than)
   * const lessThan = await client.search(autoListConfig, "id", 500, "Lt");
   * // Generated CAML: <Lt><FieldRef Name="ID" /><Value Type="Number">500</Value></Lt>
   *
   * // 8. Leq (Less or equal than)
   * const lessOrEqual = await client.search(autoListConfig, "id", 500, "Leq");
   * // Generated CAML: <Leq><FieldRef Name="ID" /><Value Type="Number">500</Value></Leq>
   *
   * // ========== NULL VALUE OPERATORS ==========
   *
   * // 9. IsNull (Is null/empty)
   * const isNull = await client.search(autoListConfig, "modelo", "", "IsNull");
   * // Generated CAML: <IsNull><FieldRef Name="Modelo" /></IsNull>
   *
   * // 10. IsNotNull (Is not null/empty)
   * const isNotNull = await client.search(autoListConfig, "modelo", "", "IsNotNull");
   * // Generated CAML: <IsNotNull><FieldRef Name="Modelo" /></IsNotNull>
   *
   * // ========== DATE OPERATORS ==========
   *
   * // 11. DateRangesOverlap (Date range overlaps)
   * const dateOverlap = await client.search(autoListConfig, "fecha", "2024-01-01T00:00:00Z", "DateRangesOverlap");
   * // Generated CAML: <DateRangesOverlap><FieldRef Name="FechaRegistro" /><Value Type="DateTime">2024-01-01T00:00:00Z</Value></DateRangesOverlap>
   *
   * // ========== ADVANCED OPERATORS ==========
   *
   * // 12. In (In list of values) - requires using read() directly with CAML filter
   * // const inValues = await client.read(autoListConfig, {
   * //   filter: `<In><FieldRef Name="Marca" /><Values><Value Type="Text">Toyota</Value><Value Type="Text">Honda</Value></Values></In>`
   * // });
   *
   * // ========== PRACTICAL EXAMPLES ==========
   *
   * // Search cars of a specific brand
   * const toyotaCars = await client.search(autoListConfig, "marca", "Toyota", "Eq");
   * console.log(`Found ${toyotaCars.count} Toyota cars`);
   *
   * // Search plates containing certain text
   * const placasABC = await client.search(autoListConfig, "placa", "ABC", "Contains");
   * console.log(`Found ${placasABC.count} plates with 'ABC'`);
   *
   * // Search cars registered after certain date
   * const recent = await client.search(autoListConfig, "fecha", "2024-01-01", "Gt");
   * console.log(`${recent.count} cars registered after January 1, 2024`);
   *
   * // Search models that are not empty
   * const withModel = await client.search(autoListConfig, "modelo", "", "IsNotNull");
   * console.log(`${withModel.count} cars have specified model`);
   * ```
   *
   * @note **Field mapping**: The `fieldName` parameter must be the **config key**
   * (e.g., "placa"), which maps automatically to the actual SharePoint field name
   * (e.g., "Placa") using `listConfig.fields[fieldName]`.
   *
   * @note **Available CAML operators**:
   * - **Comparison**: Eq, Neq, Contains, BeginsWith
   * - **Numeric**: Gt, Geq, Lt, Leq
   * - **Null**: IsNull, IsNotNull
   * - **Date**: DateRangesOverlap
   * - **Advanced**: In (use with read() directly)
   *
   * @note **Supported data types**:
   * - **Text**: Text strings
   * - **Number**: Integer and decimal numbers
   * - **DateTime**: Dates in ISO format (YYYY-MM-DDTHH:mm:ssZ)
   * - **Boolean**: true/false (as "1"/"0")
   * - **Choice**: Select field values
   * - **Lookup**: Lookup field IDs
   */
  async search(
    listConfig,
    fieldName,
    searchValue,
    operator = "Contains",
    fields,
    rowLimit,
  ) {
    await this._ensureInitialized();

    const validatedConfig = validateListConfig(listConfig);
    if (!validatedConfig.isValid) {
      throw new InvalidListConfigError(
        validatedConfig.errorMessage,
      );
    }
    const sharePointFieldName = listConfig.fields[fieldName];

    let valueType = "Text";
    if (typeof searchValue === "number") {
      valueType = "Number";
    } else if (searchValue instanceof Date) {
      valueType = "DateTime";
      searchValue = searchValue.toISOString();
    } else if (typeof searchValue === "boolean") {
      valueType = "Boolean";
      searchValue = searchValue ? "1" : "0";
    }

    const noValueOperators = ["IsNull", "IsNotNull"];

    let filterXml;
    if (noValueOperators.includes(operator)) {
      filterXml =
        `<${operator}><FieldRef Name="${sharePointFieldName}" /></${operator}>`;
    } else {
      filterXml =
        `<${operator}><FieldRef Name="${sharePointFieldName}" /><Value Type="${valueType}">${searchValue}</Value></${operator}>`;
    }

    const searchOptions = {
      filter: filterXml,
      orderBy: { field: "Modified", ascending: false },
    };
    if (fields) {
      searchOptions.fields = fields;
    }
    if (rowLimit) {
      searchOptions.rowLimit = rowLimit;
    }

    return await this.read(listConfig, searchOptions);
  }

  /**
   * Gets an item by ID
   * @param {Object} listConfig - List configuration
   * @param {number} itemId - Item ID
   * @param {string[]} fields - List of fields to use
   * @returns {Promise<Object>} - Found item
   * @example
   * ```ts
   * import { SharePointClient } from "@spark-sdk/core";
   * const client = SharePointClient.getInstance();
   * const taskListConfig = SPListBuilder.create("Tasks", {
   *   description: "Description",
   *   status: "Status"
   * });
   *
   * try {
   *   const result = await client.getById(taskListConfig, 1);
   *   if (result.success) {
   *     console.log("Item found:", result.item);
   *   }
   * } catch (error) {
   *   console.error("Error getting item:", error);
   * }
   * ```
   */
  async getById(listConfig, itemId, fields) {
    const options = {
      filter:
        `<Eq><FieldRef Name="ID" /><Value Type="Number">${itemId}</Value></Eq>`,
    };
    if (fields) {
      options.fields = fields;
    }

    const result = await this.read(listConfig, options);

    if (result.success && result.items.length > 0) {
      return {
        success: true,
        item: result.items[0],
        listName: result.listName,
      };
    }

    return {
      success: false,
      error: "Item not found",
      listName: result.listName,
    };
  }

  /**
   * Updates an existing item
   * @param {Object} listConfig - List configuration
   * @param {number} itemId - Item ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Operation result
   * @example
   * ```ts
   * import { SharePointClient } from "@spark-sdk/core";
   * const client = SharePointClient.getInstance();
   * const taskListConfig = SPListBuilder.create("Tasks", {
   *   status: "Status"
   * });
   *
   * const dataToUpdate = {
   *   status: "Completed"
   * };
   *
   * try {
   *   const result = await client.update(taskListConfig, 1, dataToUpdate);
   *   console.log("Item updated:", result);
   * } catch (error) {
   *   console.error("Error updating item:", error);
   * }
   * ```
   */
  async update(listConfig, itemId, updateData) {
    await this._ensureInitialized();

    const validatedConfig = validateListConfig(listConfig);
    if (!validatedConfig.isValid) {
      throw new InvalidListConfigError(
        validatedConfig.errorMessage,
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const list = this.web.get_lists().getByTitle(listConfig.name);
        const item = list.getItemById(itemId);

        Object.keys(updateData).forEach((key) => {
          if (listConfig.fields[key]) {
            const fieldValue = this._processFieldValue(updateData[key]);
            item.set_item(listConfig.fields[key], fieldValue);
          }
        });

        item.update();
        this.context.load(item);

        this.context.executeQueryAsync(
          () => {
            const itemData = this._processItemData(item, listConfig);
            const result = {
              success: true,
              data: itemData,
              listName: listConfig.name,
              message: "Item updated successfully",
            };

            this.tty.log(
              `Item ${itemId} updated in ${listConfig.name}`,
            );
            resolve(result);
          },
          (_sender, args) => {
            const error = {
              success: false,
              error: args.get_message(),
              details: args.get_stackTrace(),
              listName: listConfig.name,
            };

            this.tty.logError(
              `Error updating item in ${listConfig.name}`,
              error,
            );
            reject(error);
          },
        );
      } catch (error) {
        this.tty.logError("Error in update method", error);
        reject({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Deletes an item
   * @param {Object} listConfig - List configuration
   * @param {number} itemId - Item ID
   * @returns {Promise<Object>} - Operation result
   * @example
   * ```ts
   * import { SharePointClient } from "@spark-sdk/core";
   * const client = SharePointClient.getInstance();
   * const taskListConfig = SPListBuilder.create("Tasks", {});
   *
   * try {
   *   const result = await client.delete(taskListConfig, 1);
   *   console.log("Item deleted:", result);
   * } catch (error) {
   *   console.error("Error deleting item:", error);
   * }
   * ```
   */
  async delete(listConfig, itemId) {
    await this._ensureInitialized();

    const validatedConfig = validateListConfig(listConfig);
    if (!validatedConfig.isValid) {
      throw new InvalidListConfigError(
        validatedConfig.errorMessage,
      );
    }

    // Get previous item data before deleting
    // to return to user (similar to how update returns state)
    const getResult = await this.getById(listConfig, itemId);
    if (!getResult.success) {
      return Promise.reject({
        success: false,
        error: `Item with ID ${itemId} not found`,
        listName: listConfig.name,
      });
    }

    const previousItemData = getResult.item;

    return new Promise((resolve, reject) => {
      try {
        const list = this.web.get_lists().getByTitle(listConfig.name);
        const item = list.getItemById(itemId);

        item.deleteObject();

        this.context.executeQueryAsync(
          () => {
            const result = {
              success: true,
              data: previousItemData,
              listName: listConfig.name,
              message: "Item deleted successfully",
            };

            this.tty.log(`Item ${itemId} deleted from ${listConfig.name}`);
            resolve(result);
          },
          (_sender, args) => {
            const error = {
              success: false,
              error: args.get_message(),
              details: args.get_stackTrace(),
              listName: listConfig.name,
            };

            this.tty.logError(
              `Error deleting item from ${listConfig.name}`,
              error,
            );
            reject(error);
          },
        );
      } catch (error) {
        this.tty.logError("Error in delete method", error);
        reject({
          success: false,
          error: error.message,
        });
      }
    });
  }
}
