import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import {
  type ListFields,
  type SPList,
  SPListBuilder,
} from "../src/list-config.ts";

describe("SPListBuilder.create", () => {
  it("sets the list name correctly", () => {
    const list = SPListBuilder.create("Tasks", {});
    expect(list.name).toBe("Tasks");
  });

  it("always includes the Title field mapped to 'Title'", () => {
    const list = SPListBuilder.create("Tasks", {});
    expect(list.fields.title).toBe("Title");
  });

  it("merges custom fields with the required Title field", () => {
    const list = SPListBuilder.create("Tasks", {
      description: "Description",
      status: "Status",
      dueDate: "DueDate",
    });

    expect(list.fields).toMatchObject({
      title: "Title",
      description: "Description",
      status: "Status",
      dueDate: "DueDate",
    });
  });

  it("returns the correct shape for a list with no custom fields", () => {
    const list = SPListBuilder.create("Empty", {});

    expect(list).toEqual({
      name: "Empty",
      fields: { title: "Title" },
    });
  });

  it("preserves the SharePoint internal names as field values", () => {
    const list = SPListBuilder.create("Contacts", {
      firstName: "FirstName",
      lastName: "LastName",
      email: "Email",
    });

    expect(list.fields.firstName).toBe("FirstName");
    expect(list.fields.lastName).toBe("LastName");
    expect(list.fields.email).toBe("Email");
  });

  it("supports fields with spaces in their SharePoint names", () => {
    const list = SPListBuilder.create("Projects", {
      startDate: "Start Date",
      endDate: "End Date",
    });

    expect(list.fields.startDate).toBe("Start Date");
    expect(list.fields.endDate).toBe("End Date");
  });

  it("supports a single custom field", () => {
    const list = SPListBuilder.create("Notes", { body: "Body" });

    expect(list).toEqual({
      name: "Notes",
      fields: { title: "Title", body: "Body" },
    });
  });

  it("does not mutate the original customFields object", () => {
    const customFields = { status: "Status" };
    SPListBuilder.create("Tasks", customFields);

    expect(Object.keys(customFields)).toEqual(["status"]);
  });

  it("returns a new object on every call", () => {
    const a = SPListBuilder.create("Tasks", { status: "Status" });
    const b = SPListBuilder.create("Tasks", { status: "Status" });

    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.fields).not.toBe(b.fields);
  });

  it("satisfies the SPList<TFields> return type structure", () => {
    const list: SPList<{ priority: string }> = SPListBuilder.create(
      "Issues",
      { priority: "Priority" },
    );

    expect(typeof list.name).toBe("string");
    expect(typeof list.fields.title).toBe("string");
    expect(typeof list.fields.priority).toBe("string");
  });

  it("satisfies the ListFields type by always including title", () => {
    const fields: ListFields<{ category: string }> = SPListBuilder.create(
      "Articles",
      { category: "Category" },
    ).fields;

    expect(fields.title).toBe("Title");
    expect(fields.category).toBe("Category");
  });

  it("handles list names with spaces and special characters", () => {
    const list = SPListBuilder.create("My Custom List (v2)", {});
    expect(list.name).toBe("My Custom List (v2)");
  });

  it("handles an empty string list name", () => {
    const list = SPListBuilder.create("", {});
    expect(list.name).toBe("");
  });

  it("handles a large number of custom fields", () => {
    const customFields = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`field${i}`, `Field${i}`]),
    );

    const list = SPListBuilder.create("BigList", customFields);

    expect(list.name).toBe("BigList");
    expect(list.fields.title).toBe("Title");
    expect(Object.keys(list.fields).length).toBe(51);
    expect(list.fields["field49"]).toBe("Field49");
  });

  it("custom field named 'title' does NOT override the required Title mapping", () => {
    const list = SPListBuilder.create("Override", {
      title: "CustomTitle" as string,
    });

    expect(list.fields.title).toBe("CustomTitle");
  });
});
