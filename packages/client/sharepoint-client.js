/**
 * @module SharePointClient
 *
 * @description
 * SharePointClient - Clase Singleton para operaciones CRUD en listas de SharePoint
 * Solo maneja el contexto de SharePoint, las configuraciones de lista se pasan en cada operación
 */

/**
 * Default headers for SharePoint API requests.
 */
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json;odata=verbose',
};

export class SharePointClient {
  static _instance = null;

  constructor() {
    if (SharePointClient._instance) {
      return SharePointClient._instance;
    }
    this.context = null;
    this.site = null;
    this.web = null;
    this.user = null;
    this.isInitialized = false;
    this.initializationPromise = null;

    this.options = {
      enableLogging: true,
    };

    SharePointClient._instance = this;
    this._log('SharePointClient Singleton creado');
  }

  /**
   * Obtiene la instancia singleton
   * @returns {SharePointClient} - Instancia única
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * ```
   */
  static getInstance() {
    if (!SharePointClient._instance) {
      SharePointClient._instance = new SharePointClient();
    }
    return SharePointClient._instance;
  }

  /**
   * Configura las opciones globales del cliente
   * @param {Object} newOptions - Nuevas opciones
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * client.setOptions({
   *   enableLogging: false,
   * });
   * ```
   */
  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this._log('Opciones actualizadas', this.options);
  }
  /**
   * Inicializa el cliente de SharePoint
   * @returns {Promise<SharePointClient>} - Promesa que resuelve con la instancia inicializada
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * try {
   *   await client.initialize();
   *   console.log("Cliente inicializado");
   * } catch (error) {
   *   console.error("Fallo en la inicialización", error);
   * }
   * ```
   */
  initialize() {
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
   * Realiza la inicialización real
   * @private
   */
  async _performInitialization() {
    try {
      this._log('Inicializando contexto de SharePoint...');

      const contextData = await this._initializeSharePointContext();

      this.context = contextData.current;
      this.site = contextData.site;
      this.web = contextData.web;
      this.user = contextData.user;
      this.isInitialized = true;

      this._log('SharePoint Client inicializado exitosamente', {
        user: this.user?.LoginName,
      });

      return this;
    } catch (error) {
      this._logError('Error durante la inicialización', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Asegura que el cliente esté inicializado
   * @private
   */
  async _ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Inicializa el contexto de SharePoint
   * @private
   */
  _initializeSharePointContext() {
    return new Promise((resolve, reject) => {
      if (typeof SP === 'undefined' || !SP.SOD) {
        reject(
          new Error('SharePoint JavaScript libraries no están disponibles'),
        );
        return;
      }

      SP.SOD.executeFunc('sp.js', 'SP.ClientContext', async () => {
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
                throw new Error('Failed to retrieve user data');
              }

              resolve({ current: context, site, web, user });
            } catch (error) {
              this._logError('Error obteniendo datos del usuario', error);
              reject(error);
            }
          };

          const onFailure = (_sender, args) => {
            const error = new Error(
              `SharePoint context query failed: ${args.get_message()}`,
            );
            this._logError('Fallo en query de contexto', error);
            reject(error);
          };

          context.executeQueryAsync(onSuccess, onFailure);
        } catch (error) {
          this._logError('Error en executeFunc', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Obtiene datos del usuario actual
   * @private
   */
  async _getUserData(baseUrl) {
    const url = new URL(baseUrl);
    url.pathname += '/_api/web/currentUser';

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
      this._logError('Error fetching user data', err);
      return null;
    }
  }

  /**
   * Logger interno de la clase
   * @private
   */
  _log(message, data = null) {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toISOString().substring(11, 23);
    const prefix = `[SharePointClient ${timestamp}]`;

    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Logger de errores
   * @private
   */
  _logError(message, error = null) {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toISOString().substring(11, 23);
    const prefix = `[SharePointClient ${timestamp}]`;

    if (error) {
      console.error(`${prefix} ❌ ${message}`, error);
    } else {
      console.error(`${prefix} ❌ ${message}`);
    }
  }

  /**
   * Procesa valores de campo para escritura/lectura
   * @private
   */
  _processFieldValue(value, isReading = false) {
    if (value === null || value === undefined) {
      return null;
    }

    // Si estamos leyendo y el valor tiene propiedades especiales de SP
    if (isReading && typeof value === 'object') {
      // Campo de usuario/persona
      if (value.get_lookupValue) {
        return value.get_lookupValue();
      }

      // Campo de fecha
      if (value instanceof Date) {
        return value.toISOString();
      }
    }

    return value;
  }

  /**
   * Construye una consulta CAML
   * @private
   */
  _buildCamlQuery(options, listConfig) {
    const camlQuery = new SP.CamlQuery();
    let queryXml = '<View>';

    if (options.fields && options.fields.length > 0) {
      queryXml += '<ViewFields>';

      queryXml += `<FieldRef Name="ID" />`;

      if (!options.fields || options.fields.includes('title')) {
        queryXml += `<FieldRef Name="Title" />`;
      }

      options.fields.forEach((field) => {
        if (field !== 'title') {
          const sharePointFieldName = listConfig.fields[field] || field;
          queryXml += `<FieldRef Name="${sharePointFieldName}" />`;
        }
      });
      queryXml += '</ViewFields>';
    }

    if (options.filter || options.orderBy) {
      queryXml += '<Query>';

      if (options.filter) {
        queryXml += `<Where>${options.filter}</Where>`;
      }

      if (options.orderBy) {
        queryXml += '<OrderBy>';
        const sharePointFieldName = listConfig.fields[options.orderBy.field] ||
          options.orderBy.field;
        queryXml += `<FieldRef Name="${sharePointFieldName}" Ascending="${
          options.orderBy.ascending !== false
        }" />`;
        queryXml += '</OrderBy>';
      }

      queryXml += '</Query>';
    }

    if (options.rowLimit) {
      queryXml += `<RowLimit>${options.rowLimit}</RowLimit>`;
    }

    queryXml += '</View>';

    this._log('QueryXML:', queryXml);
    camlQuery.set_viewXml(queryXml);
    return camlQuery;
  }

  /**
   * Procesa los datos de un elemento
   * @private
   */
  _processItemData(item, listConfig, requestedFields = null) {
    const itemData = {
      id: item.get_id(),
    };

    const fieldsToProcess = requestedFields || Object.keys(listConfig.fields);

    if (!requestedFields || requestedFields.includes('title')) {
      itemData.title = item.get_item('Title');
    }

    fieldsToProcess.forEach((key) => {
      if (key !== 'title' && listConfig.fields[key]) {
        try {
          const fieldValue = item.get_item(listConfig.fields[key]);
          itemData[key] = this._processFieldValue(fieldValue, true);
        } catch (error) {
          this._log(
            `Campo '${key}' (${
              listConfig.fields[key]
            }) no disponible en el item`,
            error.message,
          );
        }
      }
    });

    return itemData;
  }

  /**
   * Obtiene información del usuario actual
   * @returns {Object} - Información del usuario
   * @example
   * ```js
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
   * Crea un nuevo elemento en la lista especificada
   * @param {Object} listConfig - Configuración de la lista
   * @param {Object} itemData - Datos del elemento a crear
   * @returns {Promise<Object>} - Resultado de la operación
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * const taskListConfig = ListConfigFactory.createCustomConfig("Tasks", {
   *   description: "Description",
   *   status: "Status"
   * });
   *
   * const newItem = {
   *   title: "Nueva Tarea",
   *   description: "Descripción de la nueva tarea",
   *   status: "Pendiente"
   * };
   *
   * try {
   *   const result = await client.create(taskListConfig, newItem);
   *   console.log("Elemento creado:", result);
   * } catch (error) {
   *   console.error("Error creando elemento:", error);
   * }
   * ```
   */
  async create(listConfig, itemData) {
    await this._ensureInitialized();

    const validatedConfig = validateListConfig(listConfig);
    if (!validatedConfig.isValid) {
      throw new Error(
        'Configuración de lista inválida',
        validateListConfig.errorMessage,
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
              message: 'Elemento creado exitosamente',
            };

            this._log(`Elemento creado en ${listConfig.name}`, result);
            resolve(result);
          },
          (_sender, args) => {
            const error = {
              success: false,
              error: args.get_message(),
              details: args.get_stackTrace(),
              listName: listConfig.name,
            };

            this._logError(
              `Error al crear elemento en ${listConfig.name}`,
              error,
            );
            reject(error);
          },
        );
      } catch (error) {
        this._logError('Error en método create', error);
        reject({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Lee elementos de la lista actual o especificada
   * @param {Object} listConfig - Configuración de la lista
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object>} - Elementos encontrados
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * const taskListConfig = ListConfigFactory.createCustomConfig("Tasks", {
   *   description: "Description",
   *   status: "Status"
   * });
   *
   * // Leer todos los items
   * const allItems = await client.read(taskListConfig);
   *
   * // Leer con opciones
   * const options = {
   *   fields: ["title", "status"],
   *   filter: `<Eq><FieldRef Name='Status' /><Value Type='Text'>Pendiente</Value></Eq>`,
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
      throw new Error(
        'Configuración de lista inválida',
        validateListConfig.errorMessage,
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

            this._log(
              `Se obtuvieron ${itemsArray.length} elementos de ${listConfig.name}`,
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

            this._logError(
              `Error al leer elementos de ${listConfig.name}`,
              error,
            );
            reject(error);
          },
        );
      } catch (error) {
        this._logError('Error en método read', error);
        reject({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Busca elementos por campo específico usando operadores CAML
   * @param {Object} listConfig - Configuración de la lista
   * @param {string} fieldName - Nombre del campo (usar clave de configuración, ej: "placa")
   * @param {string|number|boolean|Date} searchValue - Valor a buscar
   * @param {string} operator - Operador de comparación CAML (por defecto: "Contains")
   * @param {string[]} fields - Listado de campos a utilizar
   * @returns {Promise<Object>} - Elementos encontrados
   *
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * const autoListConfig = ListConfigFactory.createCustomConfig("Auto", {
   *   placa: "Placa",        // fieldName: "placa" -> SharePoint field: "Placa"
   *   marca: "Marca",        // fieldName: "marca" -> SharePoint field: "Marca"
   *   modelo: "Modelo",      // fieldName: "modelo" -> SharePoint field: "Modelo"
   *   activo: "Activo",      // fieldName: "activo" -> SharePoint field: "Activo"
   *   fecha: "FechaRegistro" // fieldName: "fecha" -> SharePoint field: "FechaRegistro"
   * });
   *
   * // ========== OPERADORES DE COMPARACIÓN ==========
   *
   * // 1. Eq (Igual a)
   * const exactMatch = await client.search(autoListConfig, "placa", "ABC123", "Eq");
   * // CAML generado: <Eq><FieldRef Name="Placa" /><Value Type="Text">ABC123</Value></Eq>
   *
   * // 2. Neq (No igual a / Diferente de)
   * const notEqual = await client.search(autoListConfig, "marca", "Toyota", "Neq");
   * // CAML generado: <Neq><FieldRef Name="Marca" /><Value Type="Text">Toyota</Value></Neq>
   *
   * // 3. Contains (Contiene - búsqueda parcial)
   * const contains = await client.search(autoListConfig, "placa", "ABC", "Contains");
   * // CAML generado: <Contains><FieldRef Name="Placa" /><Value Type="Text">ABC</Value></Contains>
   *
   * // 4. BeginsWith (Comienza con)
   * const startsWith = await client.search(autoListConfig, "placa", "ABC", "BeginsWith");
   * // CAML generado: <BeginsWith><FieldRef Name="Placa" /><Value Type="Text">ABC</Value></BeginsWith>
   *
   * // ========== OPERADORES NUMÉRICOS ==========
   *
   * // 5. Gt (Mayor que)
   * const greaterThan = await client.search(autoListConfig, "id", 100, "Gt");
   * // CAML generado: <Gt><FieldRef Name="ID" /><Value Type="Number">100</Value></Gt>
   *
   * // 6. Geq (Mayor o igual que)
   * const greaterOrEqual = await client.search(autoListConfig, "id", 100, "Geq");
   * // CAML generado: <Geq><FieldRef Name="ID" /><Value Type="Number">100</Value></Geq>
   *
   * // 7. Lt (Menor que)
   * const lessThan = await client.search(autoListConfig, "id", 500, "Lt");
   * // CAML generado: <Lt><FieldRef Name="ID" /><Value Type="Number">500</Value></Lt>
   *
   * // 8. Leq (Menor o igual que)
   * const lessOrEqual = await client.search(autoListConfig, "id", 500, "Leq");
   * // CAML generado: <Leq><FieldRef Name="ID" /><Value Type="Number">500</Value></Leq>
   *
   * // ========== OPERADORES DE VALORES NULOS ==========
   *
   * // 9. IsNull (Es nulo/vacío)
   * const isNull = await client.search(autoListConfig, "modelo", "", "IsNull");
   * // CAML generado: <IsNull><FieldRef Name="Modelo" /></IsNull>
   *
   * // 10. IsNotNull (No es nulo/vacío)
   * const isNotNull = await client.search(autoListConfig, "modelo", "", "IsNotNull");
   * // CAML generado: <IsNotNull><FieldRef Name="Modelo" /></IsNotNull>
   *
   * // ========== OPERADORES DE FECHA ==========
   *
   * // 11. DateRangesOverlap (Rango de fechas se superpone)
   * const dateOverlap = await client.search(autoListConfig, "fecha", "2024-01-01T00:00:00Z", "DateRangesOverlap");
   * // CAML generado: <DateRangesOverlap><FieldRef Name="FechaRegistro" /><Value Type="DateTime">2024-01-01T00:00:00Z</Value></DateRangesOverlap>
   *
   * // ========== OPERADORES AVANZADOS ==========
   *
   * // 12. In (En lista de valores) - requiere usar read() directamente con filtro CAML
   * // const inValues = await client.read(autoListConfig, {
   * //   filter: `<In><FieldRef Name="Marca" /><Values><Value Type="Text">Toyota</Value><Value Type="Text">Honda</Value></Values></In>`
   * // });
   *
   * // ========== EJEMPLOS DE USO PRÁCTICO ==========
   *
   * // Buscar autos de una marca específica
   * const toyotaCars = await client.search(autoListConfig, "marca", "Toyota", "Eq");
   * console.log(`Encontrados ${toyotaCars.count} autos Toyota`);
   *
   * // Buscar placas que contengan cierto texto
   * const placasABC = await client.search(autoListConfig, "placa", "ABC", "Contains");
   * console.log(`Encontradas ${placasABC.count} placas con 'ABC'`);
   *
   * // Buscar autos registrados después de cierta fecha
   * const recent = await client.search(autoListConfig, "fecha", "2024-01-01", "Gt");
   * console.log(`${recent.count} autos registrados después del 1 enero 2024`);
   *
   * // Buscar modelos que no estén vacíos
   * const withModel = await client.search(autoListConfig, "modelo", "", "IsNotNull");
   * console.log(`${withModel.count} autos tienen modelo especificado`);
   * ```
   *
   * @note **Mapeo de campos**: El parámetro `fieldName` debe ser la **clave de configuración**
   * (ej: "placa"), que se mapea automáticamente al nombre real del campo en SharePoint
   * (ej: "Placa") usando `listConfig.fields[fieldName]`.
   *
   * @note **Operadores CAML disponibles**:
   * - **Comparación**: Eq, Neq, Contains, BeginsWith
   * - **Numéricos**: Gt, Geq, Lt, Leq
   * - **Nulos**: IsNull, IsNotNull
   * - **Fechas**: DateRangesOverlap
   * - **Avanzados**: In (usar con read() directamente)
   *
   * @note **Tipos de datos soportados**:
   * - **Text**: Cadenas de texto
   * - **Number**: Números enteros y decimales
   * - **DateTime**: Fechas en formato ISO (YYYY-MM-DDTHH:mm:ssZ)
   * - **Boolean**: true/false (como "1"/"0")
   * - **Choice**: Valores de campos de selección
   * - **Lookup**: IDs de campos de búsqueda
   */
  async search(
    listConfig,
    fieldName,
    searchValue,
    operator = 'Contains',
    fields,
    rowLimit,
  ) {
    await this._ensureInitialized();

    const validatedConfig = validateListConfig(listConfig);
    if (!validatedConfig.isValid) {
      throw new Error(
        'Configuración de lista inválida',
        validateListConfig.errorMessage,
      );
    }
    const sharePointFieldName = listConfig.fields[fieldName];

    let valueType = 'Text';
    if (typeof searchValue === 'number') {
      valueType = 'Number';
    } else if (searchValue instanceof Date) {
      valueType = 'DateTime';
      searchValue = searchValue.toISOString();
    } else if (typeof searchValue === 'boolean') {
      valueType = 'Boolean';
      searchValue = searchValue ? '1' : '0';
    }

    const noValueOperators = ['IsNull', 'IsNotNull'];

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
      orderBy: { field: 'Modified', ascending: false },
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
   * Obtiene un elemento por ID
   * @param {Object} listConfig - Configuración de la lista
   * @param {number} itemId - ID del elemento
   * @param {string[]} fields - Listado de campos a utilizar
   * @returns {Promise<Object>} - Elemento encontrado
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * const taskListConfig = ListConfigFactory.createCustomConfig("Tasks", {
   *   description: "Description",
   *   status: "Status"
   * });
   *
   * try {
   *   const result = await client.getById(taskListConfig, 1);
   *   if (result.success) {
   *     console.log("Elemento encontrado:", result.item);
   *   }
   * } catch (error) {
   *   console.error("Error obteniendo elemento:", error);
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
      error: 'Elemento no encontrado',
      listName: result.listName,
    };
  }

  /**
   * Actualiza un elemento existente
   * @param {Object} listConfig - Configuración de la lista
   * @param {number} itemId - ID del elemento
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Resultado de la operación
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * const taskListConfig = ListConfigFactory.createCustomConfig("Tasks", {
   *   status: "Status"
   * });
   *
   * const dataToUpdate = {
   *   status: "Completado"
   * };
   *
   * try {
   *   const result = await client.update(taskListConfig, 1, dataToUpdate);
   *   console.log("Elemento actualizado:", result);
   * } catch (error) {
   *   console.error("Error actualizando elemento:", error);
   * }
   * ```
   */
  async update(listConfig, itemId, updateData) {
    await this._ensureInitialized();

    const validatedConfig = validateListConfig(listConfig);
    if (!validatedConfig.isValid) {
      throw new Error(
        'Configuración de lista inválida',
        validateListConfig.errorMessage,
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
              message: 'Elemento actualizado exitosamente',
            };

            this._log(
              `Elemento ${itemId} actualizado en ${listConfig.name}`,
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

            this._logError(
              `Error al actualizar elemento en ${listConfig.name}`,
              error,
            );
            reject(error);
          },
        );
      } catch (error) {
        this._logError('Error en método update', error);
        reject({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Elimina un elemento
   * @param {Object} listConfig - Configuración de la lista
   * @param {number} itemId - ID del elemento
   * @returns {Promise<Object>} - Resultado de la operación
   * @example
   * ```js
   * const client = SharePointClient.getInstance();
   * const taskListConfig = ListConfigFactory.createCustomConfig("Tasks", {});
   *
   * try {
   *   const result = await client.delete(taskListConfig, 1);
   *   console.log("Elemento eliminado:", result);
   * } catch (error) {
   *   console.error("Error eliminando elemento:", error);
   * }
   * ```
   */
  async delete(listConfig, itemId) {
    await this._ensureInitialized();

    const validatedConfig = validateListConfig(listConfig);
    if (!validatedConfig.isValid) {
      throw new Error(
        'Configuración de lista inválida',
        validateListConfig.errorMessage,
      );
    }

    // Obtener datos previos del elemento antes de eliminarlo
    // para retornarlos al usuario (similar a como update retorna el estado)
    const getResult = await this.getById(listConfig, itemId);
    if (!getResult.success) {
      return Promise.reject({
        success: false,
        error: `No se encontró el elemento con ID ${itemId}`,
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
              message: 'Elemento eliminado exitosamente',
            };

            this._log(`Elemento ${itemId} eliminado de ${listConfig.name}`);
            resolve(result);
          },
          (_sender, args) => {
            const error = {
              success: false,
              error: args.get_message(),
              details: args.get_stackTrace(),
              listName: listConfig.name,
            };

            this._logError(
              `Error al eliminar elemento de ${listConfig.name}`,
              error,
            );
            reject(error);
          },
        );
      } catch (error) {
        this._logError('Error en método delete', error);
        reject({
          success: false,
          error: error.message,
        });
      }
    });
  }
}

export class ListConfigFactory {
  /**
   * Configuración personalizada
   * @param {string} listName - Nombre de la lista
   * @param {Object} customFields - Campos personalizados
   * @returns {Object} - Configuración de lista
   * @example
   * ```js
   * const taskListConfig = ListConfigFactory.createCustomConfig("Tasks", {
   *   description: "Description",
   *   status: "Status",
   *   dueDate: "DueDate"
   * });
   * ```
   */
  static createCustomConfig(listName, customFields) {
    return {
      name: listName,
      fields: {
        title: 'Title',
        ...customFields,
      },
    };
  }
}

/**
 * Valida la configuración de una lista
 * @param {Object} config - Configuración de la lista a validar
 * @returns {Object} - { isValid: boolean, errorMessage: string }
 */
function validateListConfig(config) {
  if (!config || typeof config !== 'object') {
    return {
      isValid: false,
      errorMessage: 'ListConfig es requerido y debe ser un objeto',
    };
  }

  if (!config.name || typeof config.name !== 'string') {
    return {
      isValid: false,
      errorMessage: 'ListConfig.name es requerido y debe ser un string',
    };
  }

  if (!config.fields || typeof config.fields !== 'object') {
    return {
      isValid: false,
      errorMessage: 'ListConfig.fields es requerido y debe ser un objeto',
    };
  }

  if (!config.fields.title) {
    return {
      isValid: false,
      errorMessage: 'ListConfig.fields.title es requerido',
    };
  }

  return {
    isValid: true,
    errorMessage: null,
  };
}
