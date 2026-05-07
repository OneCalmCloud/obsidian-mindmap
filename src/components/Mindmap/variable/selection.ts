import emitter from "@/mitt";
import * as d3 from "../d3";
import { getCurrentLeafId, setCurrentLeafId } from "../instance";

type SelectionBucket = {
  svg?: d3.Selection<SVGSVGElement, null, null, null>;
  g?: d3.Selection<SVGGElement, null, SVGSVGElement, null>;
  asstSvg?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  foreign?: d3.Selection<SVGForeignObjectElement, null, null, undefined>;
};

const byLeaf = new Map<string, SelectionBucket>();

function bucket(leafId: string): SelectionBucket {
  let b = byLeaf.get(leafId);
  if (!b) {
    b = {};
    byLeaf.set(leafId, b);
  }
  return b;
}

export function getSelection(leafId = getCurrentLeafId()): SelectionBucket {
  return bucket(leafId);
}

export const selection = {
  get svg() {
    return getSelection().svg;
  },
  get g() {
    return getSelection().g;
  },
  get asstSvg() {
    return getSelection().asstSvg;
  },
  get foreign() {
    return getSelection().foreign;
  },
};

type SelectionEvent<T> = { leafId: string; val: T };

emitter.on<SelectionEvent<d3.Selection<SVGSVGElement, null, null, null>>>("selection-svg", (payload) => {
  if (!payload?.leafId) return;
  setCurrentLeafId(payload.leafId);
  bucket(payload.leafId).svg = payload.val;
});
emitter.on<SelectionEvent<d3.Selection<SVGGElement, null, SVGSVGElement, null>>>("selection-g", (payload) => {
  if (!payload?.leafId) return;
  setCurrentLeafId(payload.leafId);
  bucket(payload.leafId).g = payload.val;
});
emitter.on<SelectionEvent<d3.Selection<SVGSVGElement, unknown, null, undefined>>>("selection-asstSvg", (payload) => {
  if (!payload?.leafId) return;
  setCurrentLeafId(payload.leafId);
  bucket(payload.leafId).asstSvg = payload.val;
});
emitter.on<SelectionEvent<d3.Selection<SVGForeignObjectElement, null, null, undefined>>>("selection-foreign", (payload) => {
  if (!payload?.leafId) return;
  setCurrentLeafId(payload.leafId);
  bucket(payload.leafId).foreign = payload.val;
});
