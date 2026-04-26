// @ts-nocheck Ignore TypeScript errors for test file
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertObjectMatch, assertRejects } from "@std/assert";
import { assertSpyCalls, spy, stub } from "@std/testing/mock";
import {
  ListConfigFactory,
  SharePointClient,
} from "../src/sharepoint-client.ts";

describe("SharePointClient", () => {
  let fetchStub;
  let spMock;
  let contextMock;
  let webMock;
  let listMock;
  let itemMock;
  let itemsMock;
  let enumeratorMock;

  beforeEach(() => {
    // Reset Singleton
    SharePointClient._instance = null;

    // Enhanced Mock Item Factory
    const createMockItem = (id, initialData = {}) => {
      const data = { ...initialData };
      return {
        get_id: () => id,
        get_item: (key) => data[key],
        set_item: spy((key, value) => {
          data[key] = value;
        }),
        update: spy(),
        deleteObject: spy(),
        // Helper for test verification
        _getData: () => data,
      };
    };

    // Default item for basic tests
    itemMock = createMockItem(1, {
      "Title": "Test Item",
      "Status": "Pending",
      "Description": "Test Description",
    });

    enumeratorMock = {
      _items: [itemMock],
      _index: -1,
      moveNext: function () {
        this._index++;
        return this._index < this._items.length;
      },
      get_current: function () {
        return this._items[this._index];
      },
    };

    itemsMock = {
      getEnumerator: () => enumeratorMock,
    };

    listMock = {
      addItem: spy(() => {
        // Create a new item for create operations
        return createMockItem(2, {});
      }),
      getItems: spy(() => itemsMock),
      getItemById: spy((id) => {
        if (id === 1) return itemMock;
        return createMockItem(id, { "Title": "Fetched Item" });
      }),
      getByTitle: function () {
        return this;
      },
    };

    const listsMock = {
      getByTitle: spy(() => listMock),
    };

    webMock = {
      get_url: () => "https://example.sharepoint.com/sites/test",
      get_lists: () => listsMock,
    };

    contextMock = {
      get_site: () => ({}),
      get_web: () => webMock,
      load: spy(),
      executeQueryAsync: spy((success, failure) => {
        if (success) success();
      }),
    };

    // Capture CAML queries
    let capturedCamlXml = "";

    spMock = {
      SOD: {
        executeFunc: (script, className, callback) => callback(),
      },
      ClientContext: {
        get_current: () => contextMock,
      },
      ListItemCreationInformation: class {},
      CamlQuery: class {
        constructor() {
          this.viewXml = "";
        }
        set_viewXml(xml) {
          this.viewXml = xml;
          capturedCamlXml = xml;
        }
        get_viewXml() {
          return this.viewXml;
        }
      },
      // Expose captured XML for tests
      _getLastCamlQuery: () => capturedCamlXml,
      _resetCamlQuery: () => {
        capturedCamlXml = "";
      },
    };

    globalThis.SP = spMock;

    // Mock fetch for user data
    fetchStub = stub(globalThis, "fetch", () => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            d: {
              LoginName: "i:0#.f|membership|user@example.com",
              Title: "Test User",
              Email: "user@example.com",
            },
          }),
      });
    });
  });

  afterEach(() => {
    fetchStub.restore();
    delete globalThis.SP;
  });

  describe("Singleton & Initialization", () => {
    it("should create a singleton instance", () => {
      const client1 = SharePointClient.getInstance();
      const client2 = SharePointClient.getInstance();
      assertEquals(client1, client2);
    });

    it("should initialize correctly", async () => {
      const client = SharePointClient.getInstance();
      await client.initialize();

      assertEquals(client.isInitialized, true);
      assertObjectMatch(client.user, { Title: "Test User" });
      assertSpyCalls(fetchStub, 1);
    });

    it("should handle initialization errors if SP is missing", async () => {
      delete globalThis.SP;
      const client = SharePointClient.getInstance();
      await assertRejects(
        () => client.initialize(),
        Error,
        "SharePoint JavaScript libraries no están disponibles",
      );
    });
  });

  describe("CRUD Operations", () => {
    let client;
    const listConfig = ListConfigFactory.createCustomConfig("Tasks", {
      status: "Status",
      description: "Description",
    });

    beforeEach(async () => {
      client = SharePointClient.getInstance();
      await client.initialize();

      // Reset spies after initialization
      contextMock.executeQueryAsync = spy((success, failure) => success());
      contextMock.load = spy();
    });

    describe("CREATE", () => {
      it("should create an item and return plain object with all data", async () => {
        const newItemData = {
          title: "New Task",
          status: "Pending",
          description: "Task Description",
        };

        const result = await client.create(listConfig, newItemData);

        assertEquals(result.success, true);
        assertEquals(result.data.id, 2); // New item ID from mock
        assertEquals(result.data.title, "New Task");
        // Note: After create, processItemData reads back the stored values
        // Our mock sets values via set_item, so they should be present
        assertEquals(result.data.status, "Pending");
        assertEquals(result.data.description, "Task Description");
        assertEquals(result.listName, "Tasks");

        // Verify SP operations
        assertSpyCalls(listMock.addItem, 1);
        assertSpyCalls(contextMock.executeQueryAsync, 1);
      });
    });

    describe("READ", () => {
      it("should retrieve items", async () => {
        const result = await client.read(listConfig);

        assertEquals(result.success, true);
        assertEquals(result.items.length, 1);
        assertEquals(result.items[0].title, "Test Item");
        assertEquals(result.items[0].status, "Pending");
        assertEquals(result.items[0].description, "Test Description");

        assertSpyCalls(listMock.getItems, 1);
      }); // read returns items array, not wrapped in data

      it("getById should retrieve a single item as plain object", async () => {
        const result = await client.getById(listConfig, 1);

        assertEquals(result.success, true);
        assertEquals(result.item.id, 1);
        assertEquals(result.item.title, "Test Item");
        assertEquals(result.item.status, "Pending");

        assertSpyCalls(listMock.getItems, 1);
      }); // getById returns item directly, not wrapped in data
    });

    describe("UPDATE", () => {
      it("should update an item and return updated plain object", async () => {
        const updateData = {
          status: "Completed",
          description: "Updated Description",
        };

        const result = await client.update(listConfig, 1, updateData);

        assertEquals(result.success, true);
        assertEquals(result.data.id, 1);

        // Verify the result is a plain object with updated data
        assertEquals(result.data.status, "Completed");
        assertEquals(result.data.description, "Updated Description");
        assertEquals(result.data.title, "Test Item"); // Unchanged fields should remain

        assertSpyCalls(listMock.getItemById, 1);
        assertSpyCalls(contextMock.executeQueryAsync, 1);
      });

      it("should NOT return the SP Item object, but plain data", async () => {
        const updateData = { status: "Done" };
        const result = await client.update(listConfig, 1, updateData);

        // Result should NOT have SP Item methods
        assertEquals(typeof result.data.get_item, "undefined");
        assertEquals(typeof result.data.set_item, "undefined");
        assertEquals(typeof result.data.deleteObject, "undefined");

        // Result should have plain object properties
        assertEquals(typeof result.data.status, "string");
      });
    });

    describe("DELETE", () => {
      it("should return the previous item data before deletion", async () => {
        // itemMock has initial data
        const result = await client.delete(listConfig, 1);

        assertEquals(result.success, true);
        assertEquals(result.data.id, 1);
        assertEquals(result.data.title, "Test Item");
        assertEquals(result.data.status, "Pending");
        assertEquals(result.data.description, "Test Description");

        // delete calls getById internally which uses getItems
        // Then it calls getItemById to delete the item
        assertSpyCalls(listMock.getItems, 1);
        assertSpyCalls(listMock.getItemById, 1);
        assertSpyCalls(itemMock.deleteObject, 1);
      });

      it("should fail if item does not exist", async () => {
        // Mock getItems to return empty list
        const emptyEnumerator = {
          _items: [],
          _index: -1,
          moveNext: function () {
            return false;
          },
          get_current: function () {
            return null;
          },
        };
        listMock.getItems = spy(() => {
          return { getEnumerator: () => emptyEnumerator };
        });

        try {
          await client.delete(listConfig, 999);
          throw new Error("Should have failed");
        } catch (error) {
          assertEquals(error.success, false);
          assertEquals(error.error.includes("No se encontró"), true);
        }
      });

      it("should return plain object, not SP Item", async () => {
        const result = await client.delete(listConfig, 1);

        // Result should NOT have SP Item methods
        assertEquals(typeof result.data.get_item, "undefined");
        assertEquals(typeof result.data.set_item, "undefined");

        // Result should have plain object properties
        assertEquals(typeof result.data.title, "string");
        assertEquals(typeof result.data.status, "string");
      });
    });
  });

  describe("CAML Query Construction", () => {
    let client;
    const listConfig = ListConfigFactory.createCustomConfig("Tasks", {
      status: "Status",
      description: "Description",
    });

    beforeEach(async () => {
      client = SharePointClient.getInstance();
      await client.initialize();
      globalThis.SP._resetCamlQuery();
    });

    it("search with 'Eq' operator generates correct CAML", async () => {
      await client.search(listConfig, "status", "Pending", "Eq");
      const xml = globalThis.SP._getLastCamlQuery();
      const expected =
        '<Eq><FieldRef Name="Status" /><Value Type="Text">Pending</Value></Eq>';
      assertEquals(
        xml.includes(expected),
        true,
        `Expected XML to contain ${expected}, got ${xml}`,
      );
    });

    it("search with 'Contains' operator", async () => {
      await client.search(listConfig, "description", "Task", "Contains");
      const xml = globalThis.SP._getLastCamlQuery();
      const expected =
        '<Contains><FieldRef Name="Description" /><Value Type="Text">Task</Value></Contains>';
      assertEquals(xml.includes(expected), true);
    });

    it("read with filter, orderBy, and rowLimit", async () => {
      const options = {
        filter:
          "<Eq><FieldRef Name='Status' /><Value Type='Text'>Pending</Value></Eq>",
        orderBy: { field: "title", ascending: false },
        rowLimit: 5,
      };

      await client.read(listConfig, options);
      const xml = globalThis.SP._getLastCamlQuery();

      assertEquals(
        xml.includes(
          "<Where><Eq><FieldRef Name='Status' /><Value Type='Text'>Pending</Value></Eq></Where>",
        ),
        true,
      );
      assertEquals(
        xml.includes(
          '<OrderBy><FieldRef Name="Title" Ascending="false" /></OrderBy>',
        ),
        true,
      );
      assertEquals(xml.includes("<RowLimit>5</RowLimit>"), true);
    });
  });

  describe("Error Handling", () => {
    let client;
    const listConfig = ListConfigFactory.createCustomConfig("Tasks", {});

    beforeEach(async () => {
      client = SharePointClient.getInstance();
      await client.initialize();
    });

    it("should handle executeQueryAsync errors", async () => {
      contextMock.executeQueryAsync = spy((success, failure) => {
        const argsMock = {
          get_message: () => "SharePoint Error",
          get_stackTrace: () => "Stack Trace",
        };
        failure(null, argsMock);
      });

      try {
        await client.create(listConfig, { title: "Fail" });
        throw new Error("Should have failed");
      } catch (e) {
        assertEquals(e.success, false);
        assertEquals(e.error, "SharePoint Error");
      }
    }); // Error responses don't have data wrapper
  });
});
