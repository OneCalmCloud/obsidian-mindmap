import emitter from "@/mitt";
import cloneDeep from "lodash.clonedeep";
import { draw } from "../draw";
import type { Data, IsMdata } from "../interface";
import { getSnapshot, updateTimeTravelState } from "../state";
import { mmcontext } from "../variable";
import ImData from "./ImData";
import { getCurrentLeafId, setCurrentLeafId } from "../instance";

export { ImData }

// 思维导图数据
const mmdataByLeaf = new Map<string, ImData>();

export const getMmdata = (leafId = getCurrentLeafId()): ImData => {
  const id = String(leafId || "");
  const d = mmdataByLeaf.get(id);
  if (!d) {
    throw new Error(`mmdata not initialized for leafId=${id}`);
  }
  return d;
};

// Backward-compat export name for older imports (read-only in new flow)
export let mmdata: ImData;

emitter.on<{ leafId: string; val: ImData }>("mmdata", (payload) => {
  if (!payload?.leafId || !payload.val) return;
  setCurrentLeafId(payload.leafId);
  mmdataByLeaf.set(payload.leafId, payload.val);
  mmdata = payload.val;
});

export const afterOperation = (snap = true): void => {
  const leafId = getCurrentLeafId();
  const mm = getMmdata(leafId);
  const snapper = getSnapshot(leafId);
  if (snap) {
    snapper.snap(mm.data);
  }
  mmcontext.emit("update:modelValue", cloneDeep([mm.data.rawData]));
  updateTimeTravelState(leafId);
  draw();
};
export const rename = (id: string, name: string): void => {
  getMmdata().rename(id, name);
  afterOperation();
};
export const moveChild = (pid: string, id: string): void => {
  getMmdata().moveChild(pid, id);
  afterOperation();
};
export const moveSibling = (id: string, referenceId: string, after = 0): void => {
  getMmdata().moveSibling(id, referenceId, after);
  afterOperation();
};
export const add = (id: string, name: string | Data): IsMdata => {
  const d = getMmdata().add(id, name);
  afterOperation();
  return d;
};
export const del = (id: string): void => {
  getMmdata().delete(id);
  afterOperation();
};
export const delOne = (id: string): void => {
  getMmdata().deleteOne(id);
  afterOperation();
};
export const expand = (id: string): void => {
  getMmdata().expand(id);
  afterOperation();
};
export const collapse = (id: string): void => {
  getMmdata().collapse(id);
  afterOperation();
};
export const addSibling = (id: string, name: string, before = false): IsMdata => {
  const d = getMmdata().addSibling(id, name, before);
  afterOperation();
  return d;
};
export const addParent = (id: string, name: string): IsMdata => {
  const d = getMmdata().addParent(id, name);
  afterOperation();
  return d;
};
export const changeLeft = (id: string): void => {
  getMmdata().changeLeft(id);
  afterOperation();
};