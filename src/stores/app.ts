import { defineStore } from "pinia";
import { type App as ObsidianApp } from "obsidian";

export interface ViewTransform {
  leafId: string;
  transform: string;
}

export type FileId = {
  id: string;
  value: string;
}

export type FileIds = {
  id: string;
  value: string;
}[]

export const useAppStore = defineStore("app", {
  state: () => ({
    app: null as ObsidianApp | null,
    key: 1,
    fileIds: [] as FileIds,
    viewTransforms: [] as ViewTransform[],
  }),
  getters: {},
  actions: {
    getResourcePath(value: string) {
      if (this.app) {
        return this.app.vault.getResourcePath(this.app.metadataCache.getFirstLinkpathDest(value, ""));
      } else {
        return null;
      }
    },
    limitFileIdsLength(limit=9999){
      if (this.fileIds.length > limit) {
        const startIndex = this.fileIds.length - limit;
        const elementsToKeep = this.fileIds.slice(startIndex); // 保留最后的 1000 个元素
        this.fileIds.splice(0, this.fileIds.length, ...elementsToKeep); // 用保留的部分替换原数组
      }
    }
  },

});
