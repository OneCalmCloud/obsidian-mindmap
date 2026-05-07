import type { Ref } from "vue";
import { ref } from "vue";

/**
 * Mindmap was originally implemented with many module-level singletons
 * (mmdata, d3 selections, DOM refs, snapshot, zoomTransform...).
 *
 * For Obsidian split panes (multiple leaves) we need per-leaf state.
 * This module provides a tiny "current leaf" pointer plus per-leaf buckets.
 */

export const currentLeafId: Ref<string> = ref("");

export function setCurrentLeafId(leafId: string | null | undefined) {
  if (!leafId) return;
  currentLeafId.value = String(leafId);
}

export function getCurrentLeafId(): string {
  return currentLeafId.value;
}

