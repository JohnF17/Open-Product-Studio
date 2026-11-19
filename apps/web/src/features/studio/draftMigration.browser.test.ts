import { expect, it, vi } from "vite-plus/test";
import { randomUUID } from "../../lib/randomUUID";
import { createDraft, insertDraft, listDrafts } from "./drafts";

it("upgrades a version-one project store and rolls back the copy number when insertion fails", async () => {
  const databaseName = "studio-migration-fixture-" + randomUUID();
  const workspaceId = randomUUID();
  const original = {
    ...createDraft(workspaceId, "blank"),
    title: "Field notes",
    revision: 9,
    fields: { notes: "Saved before project recovery was introduced." },
  };
  const previous = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("projects", { keyPath: ["workspaceId", "id"] });
      store.createIndex("workspace", "workspaceId");
      store.add(original);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  previous.onversionchange = () => previous.close();
  const open = indexedDB.open.bind(indexedDB);
  const scoped = vi.spyOn(indexedDB, "open").mockImplementation((name, version) =>
    open(name === "open-product-studio-drafts" ? databaseName : name, version),
  );
  try {
    expect(await listDrafts(workspaceId)).toEqual([original]);
    await expect(insertDraft(original)).rejects.toBeDefined();
    const restored = await insertDraft({ ...original, id: randomUUID() });
    expect(restored.restoredCopy).toBe(1);
    expect(await listDrafts(workspaceId)).toEqual(expect.arrayContaining([original, restored]));
  } finally {
    scoped.mockRestore();
    previous.close();
    indexedDB.deleteDatabase(databaseName);
  }
});
