import type { Ref } from "vue";
import { ref } from "vue";
import { getCurrentLeafId } from "../instance";

type ElementBucket = {
  wrapperEle: Ref<HTMLDivElement | undefined>;
  svgEle: Ref<SVGSVGElement | undefined>;
  gEle: Ref<SVGGElement | undefined>;
  asstSvgEle: Ref<SVGSVGElement | undefined>;
  foreignEle: Ref<SVGForeignObjectElement | undefined>;
  foreignDivEle: Ref<HTMLDivElement | undefined>;
  foreignResizableDiv: Ref<HTMLDivElement | undefined>;
  uploadImageFileInput: Ref<HTMLInputElement | undefined>;
};

const byLeaf = new Map<string, ElementBucket>();

function createBucket(): ElementBucket {
  return {
    wrapperEle: ref<HTMLDivElement>(),
    svgEle: ref<SVGSVGElement>(),
    gEle: ref<SVGGElement>(),
    asstSvgEle: ref<SVGSVGElement>(),
    foreignEle: ref<SVGForeignObjectElement>(),
    foreignDivEle: ref<HTMLDivElement>(),
    foreignResizableDiv: ref<HTMLDivElement>(),
    uploadImageFileInput: ref<HTMLInputElement>(),
  };
}

export function getElements(leafId = getCurrentLeafId()): ElementBucket {
  const id = String(leafId || "");
  let b = byLeaf.get(id);
  if (!b) {
    b = createBucket();
    byLeaf.set(id, b);
  }
  return b;
}

// Backward-compat named exports: always point at "current leaf".
export const wrapperEle = {
  get value() {
    return getElements().wrapperEle.value;
  },
  set value(v: HTMLDivElement | undefined) {
    getElements().wrapperEle.value = v;
  },
} as Ref<HTMLDivElement | undefined>;

export const svgEle = {
  get value() {
    return getElements().svgEle.value;
  },
  set value(v: SVGSVGElement | undefined) {
    getElements().svgEle.value = v;
  },
} as Ref<SVGSVGElement | undefined>;

export const gEle = {
  get value() {
    return getElements().gEle.value;
  },
  set value(v: SVGGElement | undefined) {
    getElements().gEle.value = v;
  },
} as Ref<SVGGElement | undefined>;

export const asstSvgEle = {
  get value() {
    return getElements().asstSvgEle.value;
  },
  set value(v: SVGSVGElement | undefined) {
    getElements().asstSvgEle.value = v;
  },
} as Ref<SVGSVGElement | undefined>;

export const foreignEle = {
  get value() {
    return getElements().foreignEle.value;
  },
  set value(v: SVGForeignObjectElement | undefined) {
    getElements().foreignEle.value = v;
  },
} as Ref<SVGForeignObjectElement | undefined>;

export const foreignDivEle = {
  get value() {
    return getElements().foreignDivEle.value;
  },
  set value(v: HTMLDivElement | undefined) {
    getElements().foreignDivEle.value = v;
  },
} as Ref<HTMLDivElement | undefined>;

export const foreignResizableDiv = {
  get value() {
    return getElements().foreignResizableDiv.value;
  },
  set value(v: HTMLDivElement | undefined) {
    getElements().foreignResizableDiv.value = v;
  },
} as Ref<HTMLDivElement | undefined>;

export const uploadImageFileInput = {
  get value() {
    return getElements().uploadImageFileInput.value;
  },
  set value(v: HTMLInputElement | undefined) {
    getElements().uploadImageFileInput.value = v;
  },
} as Ref<HTMLInputElement | undefined>;