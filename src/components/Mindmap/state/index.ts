import { ref } from "vue";
import { Mdata } from "../interface";
import Snapshot from "./Snapshot";
import { getCurrentLeafId } from "../instance";

const snapshotByLeaf = new Map<string, Snapshot<Mdata>>();
const hasPrevByLeaf = new Map<string, ReturnType<typeof ref<boolean>>>();
const hasNextByLeaf = new Map<string, ReturnType<typeof ref<boolean>>>();

export const getSnapshot = (leafId = getCurrentLeafId()): Snapshot<Mdata> => {
  const id = String(leafId || "");
  let s = snapshotByLeaf.get(id);
  if (!s) {
    s = new Snapshot<Mdata>();
    snapshotByLeaf.set(id, s);
  }
  return s;
};

export const getHasPrev = (leafId = getCurrentLeafId()) => {
  const id = String(leafId || "");
  let r = hasPrevByLeaf.get(id);
  if (!r) {
    r = ref(false);
    hasPrevByLeaf.set(id, r);
  }
  return r;
};

export const getHasNext = (leafId = getCurrentLeafId()) => {
  const id = String(leafId || "");
  let r = hasNextByLeaf.get(id);
  if (!r) {
    r = ref(false);
    hasNextByLeaf.set(id, r);
  }
  return r;
};

// Backward-compat refs for modules that import directly (bind to current leaf)
export const hasPrev = getHasPrev();
export const hasNext = getHasNext();

export const updateTimeTravelState = (leafId = getCurrentLeafId()): void => {
  const s = getSnapshot(leafId);
  getHasPrev(leafId).value = s.hasPrev;
  getHasNext(leafId).value = s.hasNext;
};
