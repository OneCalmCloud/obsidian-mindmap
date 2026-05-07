import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

const o0 = Decoration.line({ attributes: { class: "mindmap-opacity-0" } });
const LEAF_CLASS = "mindmap-hide-inline-title";

function isMindmapDoc(text: string): boolean {
  // Mindmap files are regular markdown with frontmatter `type: mindmap-plugin`.
  return /(^|\r?\n)type:\s*mindmap-plugin\s*(\r?\n|$)/m.test(text);
}

function getLeafElFromEditor(view: EditorView): HTMLElement | null {
  // The inline title is outside the CM editor; we toggle a class on the leaf container.
  const dom = view.dom as HTMLElement;
  return dom.closest(".workspace-leaf") as HTMLElement | null;
}

function setLeafClass(view: EditorView, enabled: boolean) {
  const leafEl = getLeafElFromEditor(view);
  if (!leafEl) return;
  leafEl.classList.toggle(LEAF_CLASS, enabled);
}

export const HideMindmapMarkupExtension = ViewPlugin.fromClass(
  class {
    view: EditorView;
    decorations: DecorationSet;
    isMindmap = false;

    constructor(view: EditorView) {
      this.view = view;
      this.isMindmap = isMindmapDoc(view.state.doc.toString());
      setLeafClass(view, this.isMindmap);
      this.decorations = this.isMindmap ? this.updateDecorations(view) : Decoration.none;
    }

    updateDecorations(view: EditorView) {
      const { doc } = view.state;
      const builder = new RangeSetBuilder<Decoration>();
      for (let l = 1; l <= doc.lines; l++) {
        const line = doc.line(l);
        builder.add(line.from, line.from, o0);
      }
      return builder.finish();
    }

    update(update: ViewUpdate) {
      if (!update.docChanged) return;
      const nextIsMindmap = isMindmapDoc(update.view.state.doc.toString());
      if (!nextIsMindmap) {
        this.isMindmap = false;
        setLeafClass(update.view, false);
        this.decorations = Decoration.none;
        return;
      }
      this.isMindmap = true;
      setLeafClass(update.view, true);
      this.decorations = this.updateDecorations(update.view);
    }

    destroy() {
      setLeafClass(this.view, false);
    }
  },
  {
    decorations: (x) => x.decorations,
  }
);

