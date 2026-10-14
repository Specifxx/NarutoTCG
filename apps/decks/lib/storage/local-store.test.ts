import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalStore } from "./local-store";

function installWindow(storage: Partial<Storage>) {
  vi.stubGlobal("window", { localStorage: storage, addEventListener: vi.fn(), removeEventListener: vi.fn() });
}

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

const parseNumbers = (raw: unknown) => (Array.isArray(raw) && raw.every((n) => typeof n === "number") ? raw : null);

describe("createLocalStore", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the fallback on the server", () => {
    const store = createLocalStore<number[]>("k", [], parseNumbers);
    expect(store.get()).toEqual([]);
  });

  describe("with storage", () => {
    let storage: Storage;
    beforeEach(() => {
      storage = memoryStorage();
      installWindow(storage);
    });

    it("persists, notifies and keeps a stable snapshot between writes", () => {
      const store = createLocalStore<number[]>("k", [], parseNumbers);
      const listener = vi.fn();
      store.subscribe(listener);
      store.set([1, 2]);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(JSON.parse(storage.getItem("k")!)).toEqual([1, 2]);
      const a = store.get();
      expect(store.get()).toBe(a);
      store.set((prev) => [...prev, 3]);
      expect(store.get()).toEqual([1, 2, 3]);
    });

    it("falls back on corrupt or invalid data", () => {
      storage.setItem("k", "{not json");
      expect(createLocalStore<number[]>("k", [], parseNumbers).get()).toEqual([]);
      storage.setItem("k2", JSON.stringify(["a"]));
      expect(createLocalStore<number[]>("k2", [], parseNumbers).get()).toEqual([]);
    });
  });

  it("keeps working in memory when storage throws", () => {
    installWindow({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const store = createLocalStore<number[]>("k", [], parseNumbers);
    expect(store.get()).toEqual([]);
    store.set([7]);
    expect(store.get()).toEqual([7]);
  });
});
