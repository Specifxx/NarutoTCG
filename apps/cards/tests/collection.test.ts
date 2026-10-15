// The owned-collection store must never serve a snapshot older than localStorage:
// a toggle builds on the snapshot and writes it back, so a stale one would erase
// what another tab recorded.
import { beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "naruto-tcg:collection:v1";

/** Minimal browser `window`: localStorage plus 'storage' events from "another tab". */
function installWindow(initial: readonly string[]) {
  const storage = new Map<string, string>([[KEY, JSON.stringify(initial)]]);
  const events = new EventTarget();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  });
  // Browsers fire 'storage' only in the *other* tabs; `key` is null for clear().
  const fire = (key: string | null) => events.dispatchEvent(Object.assign(new Event("storage"), { key }));
  return {
    otherTabWrites(keys: readonly string[]) {
      storage.set(KEY, JSON.stringify(keys));
      fire(KEY);
    },
    otherTabClears() {
      storage.clear();
      fire(null);
    },
    otherTabWritesUnrelatedKey() {
      storage.set("something-else", "1");
      fire("something-else");
    },
  };
}

async function loadStore() {
  // Fresh module state (the cached snapshot) for every test.
  vi.resetModules();
  return (await import("@/lib/collection")).collectionStore;
}

describe("collection store", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("caches the snapshot while subscribed and follows writes from other tabs", async () => {
    const tab = installWindow(["ST01:ST01-001:standard"]);
    const store = await loadStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);
    expect([...first]).toEqual(["ST01:ST01-001:standard"]);

    tab.otherTabWrites(["ST01:ST01-001:standard", "ST02:ST02-001:standard"]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().has("ST02:ST02-001:standard")).toBe(true);
    unsubscribe();
  });

  it("re-reads storage when it becomes active again after other tabs wrote unobserved", async () => {
    const tab = installWindow(["ST01:ST01-001:standard"]);
    const store = await loadStore();
    // A /sets page subscribes, then the user navigates to a page without subscribers.
    const unsubscribe = store.subscribe(() => {});
    expect(store.getSnapshot().size).toBe(1);
    unsubscribe();

    tab.otherTabWrites(["ST01:ST01-001:standard", "ST02:ST02-001:standard"]);

    // Back on /sets: the first new subscriber must see the other tab's entry.
    const resubscribe = store.subscribe(() => {});
    expect([...store.getSnapshot()].sort()).toEqual(["ST01:ST01-001:standard", "ST02:ST02-001:standard"]);
    resubscribe();
  });

  it("does not drop the cache for additional subscribers", async () => {
    installWindow(["ST01:ST01-001:standard"]);
    const store = await loadStore();
    const first = store.subscribe(() => {});
    const snapshot = store.getSnapshot();
    const second = store.subscribe(() => {});
    expect(store.getSnapshot()).toBe(snapshot);
    first();
    second();
  });

  it("picks up localStorage.clear() in another tab", async () => {
    const tab = installWindow(["ST01:ST01-001:standard"]);
    const store = await loadStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.getSnapshot().size).toBe(1);

    tab.otherTabClears();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().size).toBe(0);
    unsubscribe();
  });

  it("ignores storage events for other keys", async () => {
    const tab = installWindow(["ST01:ST01-001:standard"]);
    const store = await loadStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const snapshot = store.getSnapshot();

    tab.otherTabWritesUnrelatedKey();
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(snapshot);
    unsubscribe();
  });
});
