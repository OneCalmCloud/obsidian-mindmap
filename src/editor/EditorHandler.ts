import type { Extension } from "@codemirror/state";
import type MindmapPlugin from "src/main";
import { HideMindmapMarkupExtension } from "./Fadeout";

export const EDITOR_HIDE_MINDMAP_MARKUP = "hideMindmapMarkup";

const editorExtensions: Record<string, Extension> = {
  [EDITOR_HIDE_MINDMAP_MARKUP]: HideMindmapMarkupExtension,
};

export class EditorHandler {
  private activeEditorExtensions: Extension[] = [];

  constructor(private plugin: MindmapPlugin) {}

  destroy(): void {
    // keep parity with Excalidraw style; makes GC easier
    // @ts-expect-error – allow clearing for safety
    this.plugin = null;
  }

  setup(): void {
    this.plugin.registerEditorExtension(this.activeEditorExtensions);
    // Always on: prevents source-mode flash when mindmap notes open.
    this.updateCMExtensionState(EDITOR_HIDE_MINDMAP_MARKUP, true);
  }

  updateCMExtensionState(extensionIdentifier: string, extensionState: boolean) {
    const extension = editorExtensions[extensionIdentifier];
    if (!extension) return;

    if (extensionState === true) {
      this.activeEditorExtensions.push(extension);
      // @ts-ignore – attach an identifier for removal
      this.activeEditorExtensions[this.activeEditorExtensions.length - 1].exID = extensionIdentifier;
    } else {
      for (let i = 0; i < this.activeEditorExtensions.length; i++) {
        const ext = this.activeEditorExtensions[i];
        // @ts-ignore
        if (ext.exID === extensionIdentifier) {
          this.activeEditorExtensions.splice(i, 1);
          break;
        }
      }
    }
    this.plugin.app.workspace.updateOptions();
  }
}

