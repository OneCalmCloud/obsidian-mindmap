import { type App as ObsidianApp, Plugin, PluginSettingTab, TextFileView, moment, WorkspaceLeaf, Setting, Menu, TFile, normalizePath, TFolder, MarkdownView, ViewState } from "obsidian";
import { createApp, ref, defineComponent, reactive, computed } from "vue";
import { createPinia } from "pinia";
import { useAppStore } from "./stores/app";
import MindmapAppView from "./App.vue";
import * as yaml from "js-yaml";
import i18n from './i18n'

const pinia = createPinia();
const lang = moment.locale() === "zh-cn" ? "zh-cn" : "en";


i18n.changeLanguage(lang)

interface MindmapPluginSettings {
  backgroundColor: string;
  centerBtn: boolean;
  fitBtn: boolean;
  timetravel: boolean;
  downloadBtn: boolean;
  addNodeBtn: boolean;
  zoom: boolean;
  drag: boolean;
  edit: boolean;
  contextmenu: boolean;
  sharpCorner: boolean;
  branch: number;
  xGap: number;
  yGap: number;
  scale: number;
}

const activeLeafId = ref("");

const DEFAULT_SETTINGS: Partial<MindmapPluginSettings> = {
  backgroundColor: "#eeeef3",
  centerBtn: true,
  fitBtn: true,
  timetravel: true,
  downloadBtn: true,
  addNodeBtn: true,
  zoom: true,
  drag: true,
  edit: true,
  contextmenu: true,
  sharpCorner: false,
  branch: 4,
  xGap: 84,
  yGap: 18,
  scale: 6,
};
export const VIEW_TYPE_MINDMAP = "mindmap-view";

export class MindmapView extends TextFileView {
  rawData: string;
  mindmapData: any;
  appEl: any;
  key: any;
  fileIds: any;
  vueApp: any;
  settings: MindmapPluginSettings;
  plugin: MindmapPlugin;
  leaf: WorkspaceLeaf;
  zoom: any;
  constructor(leaf: WorkspaceLeaf, plugin: MindmapPlugin) {
    super(leaf);
    this.leaf = leaf;
    this.plugin = plugin;
  }

  onload(): void {
    this.key = ref(1);
    this.mindmapData = ref([]);
    let b = this.mindmapData;
    this.fileIds = ref([]);
    this.zoom = ref(null);
    let self = this;

    let pluginApp = this.app;
    let MyComponent = defineComponent({
      setup() {
        const appStore = useAppStore();
        appStore.app = pluginApp;
        //@ts-ignore
        const shouldRender = computed(() => activeLeafId.value === self.leaf.id);

        const zoomChnage = (value: string) => {
          let find = appStore.viewTransforms.find((viewTransform) => viewTransform.leafId === activeLeafId.value);
          if (find) {
            find.transform = value;
          } else {
            appStore.viewTransforms.push({
              leafId: activeLeafId.value.toString(),
              transform: value,
            });
          }
          if (appStore.viewTransforms.length > 30) {
            appStore.viewTransforms.shift();
          }
        };

        return () => <MindmapAppView local={getLocal()} activeLeafId={activeLeafId.value} render={shouldRender.value} settings={self.plugin.settings} fileIds={self.fileIds.value} freshKey={self.key.value} data={b.value} onZoomChange={zoomChnage} onUpdate={saveFile} />;
      },
    });

    const saveFile = (dataValue: object, fileIds: any[]) => {
      this.rawData = generateTemplateStr(dataValue, fileIds);
      this.requestSave();
    };

    const getLocal = () => {
      return moment.locale() === "zh-cn" ? "zh-cn" : "en";
    };

    this.appEl = createApp(MyComponent).use(pinia);
    this.appEl.config.errorHandler = function (err: Error) {
      if (String(err).includes(`Failed to read the 'value' property from 'SVGLength'`)) {
        setTimeout(() => {
          self.key.value++;
        }, 100);
      } else {
        console.error(err);
      }
    };
    this.appEl.mount(this.containerEl);
  }
  getViewData() {
    return this.rawData;
  }

  setViewData(data: string, clear: boolean) {
    this.rawData = data;
    let matched = data.match(/```json[\r\n]([\s\S]*?)[\r\n]```/);
    if (matched[1]) {
      this.mindmapData.value = JSON.parse(matched[1]);
    }

    let matched2 = data.match(/<%%[\r\n]([\s\S]*?)[\r\n]%%>/);
    if (matched2[1]) {
      //imgData
      this.fileIds.value = parseStringToJson(matched2[1]);
    }
  }

  clear() {}

  getViewType() {
    return VIEW_TYPE_MINDMAP;
  }
}
function parseStringToJson(str: string) {
  const lines = str.split("\n");
  const result: any[] = [];
  lines.forEach((line) => {
    const match = line.match(/^(.*?):\s*\[\[(.*?)\]\]$/);
    if (match) {
      const id = match[1];
      const value = match[2];
      result.push({
        id,
        value,
      });
    }
  });

  return result;
}

function generateTemplateStr(data: object, fileIds: any[]): string {
  let mindmapData = JSON.stringify(data);
  let newFileIds = fileIds.filter((fileId) => {
    if (mindmapData.includes(fileId.id)) {
      return true;
    }
    return false;
  });
  let fileIdStr = newFileIds.map((obj) => `${obj.id}: [[${obj.value}]]`).join("\n");

  return `---\ntype: mindmap-plugin\ntags:\n  - mindmap\n---\n\n<%%\n${fileIdStr}\n%%>\n\n\`\`\`json\n${mindmapData}\n\`\`\`\n`;
}

function generateDefaultTemplateStr(): string {
  return `---\ntype: mindmap-plugin\ntags:\n  - mindmap\n---\n\n<%%\n\n%%>\n\n\`\`\`json\n${JSON.stringify({ name: i18n.t("setting.Title"), children: [{ name: i18n.t("setting.Primary Node") }] })}\n\`\`\`\n`;
}

export default class MindmapPlugin extends Plugin {
  settings: MindmapPluginSettings;
  async onload() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        menu.addItem((item) => {
          item
            .setTitle(i18n.t("setting.Create new mindmap"))
            .setIcon("document")
            .onClick(async () => {
              let folderpath = file.path;
              if (file instanceof TFile) {
                // 文件类型为 TFile（文件）
                folderpath = normalizePath(file.path.substr(0, file.path.lastIndexOf(file.name)));
              } else if (file instanceof TFolder) {
                // 文件类型为 TFolder（文件夹）
              }
              const newFileName = `Mind ${this.getCurrentTime()}.mindmap.md`; // 设置新文件名
              let fname = normalizePath(`${folderpath}/${newFileName}`);
              await this.app.vault.adapter.write(fname, generateDefaultTemplateStr()); // 创建新文件
              await this.app.workspace.openLinkText(fname, "", true); // 打开新文件
            });
        });
      })
    );

    await this.loadSettings();
    this.addSettingTab(new MindmapSettingTab(this.app, this));
    this.registerExtensions(["mindmap"], VIEW_TYPE_MINDMAP);
    this.registerView(VIEW_TYPE_MINDMAP, (leaf: WorkspaceLeaf) => new MindmapView(leaf, this));

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        const activeLeaf = this.app.workspace.activeLeaf;
        //@ts-ignore
        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
          const data = activeLeaf.view.data;
          if (data) {
            const match = data.match(/---[\r\n]([\s\S]*?)[\r\n]---/);
            if (match) {
              const frontmatterContent = match[1];
              let frontmatter = yaml.load(frontmatterContent) as { type: string; tags: string[] };
              if (frontmatter.type === "mindmap-plugin") {
                leaf.setViewState({
                  type: VIEW_TYPE_MINDMAP,
                  state: leaf.view.getState(),
                  popstate: true,
                } as ViewState);
              }
            }
          }
        }
        if (activeLeaf && activeLeaf.view instanceof MindmapView) {
          //@ts-ignore
          activeLeafId.value = activeLeaf.id;
        }
      })
    );
  }

  getCurrentTime() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const hours = String(currentDate.getHours()).padStart(2, "0");
    const minutes = String(currentDate.getMinutes()).padStart(2, "0");
    const seconds = String(currentDate.getSeconds()).padStart(2, "0");
    // 格式化时间为文本内容
    return `${year}-${month}-${day} ${hours}.${minutes}.${seconds}`;
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = reactive(Object.assign(Object.assign({}, DEFAULT_SETTINGS), loadedData));
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class MindmapSettingTab extends PluginSettingTab {
  plugin: MindmapPlugin;
  constructor(app: ObsidianApp, plugin: MindmapPlugin) {
    super(app, plugin);
  }

  display(): void {
    let { containerEl } = this;

    this.containerEl.empty();

    let backgroundColorSettingDesc = document.createDocumentFragment();
    let backgroundColorSettingDescElement = document.createElement("div");
    backgroundColorSettingDescElement.createEl("span", { text: i18n.t("setting.You can enter HTML color names, such as steelblue (refer to ") });
    backgroundColorSettingDescElement.createEl("a", { href: "https://www.w3schools.com/colors/colors_names.asp", text: "HTML Color Names" });
    backgroundColorSettingDescElement.createEl("span", { text: i18n.t("setting., or valid hexadecimal color values, for example, #e67700, or any other valid CSS color.") });
    backgroundColorSettingDesc.appendChild(backgroundColorSettingDescElement);

    new Setting(containerEl)
      .setName(i18n.t("setting.Background"))
      .setDesc(backgroundColorSettingDesc)
      .addText((text) =>
        text.setValue(this.plugin.settings.backgroundColor).onChange(async (value) => {
          this.plugin.settings.backgroundColor = value;
          await this.plugin.saveSettings();
        })
      );

    let scaleEl: HTMLDivElement;
    new Setting(containerEl)
      .setName(i18n.t("setting.Export Map Clarity"))
      .setDesc(i18n.t("setting.The higher the value, the higher the resolution of the exported image."))
      .addSlider((silder) => {
        silder.setLimits(1, 20, 1);
        silder.setValue(this.plugin.settings.scale);

        silder.onChange(async (value) => {
          this.plugin.settings.scale = value;
          silder.showTooltip();
          silder.sliderEl.createEl("span", { text: "" });
          scaleEl.innerText = ` ${value.toString()}`;
        });
      })
      .settingEl.createDiv("", (el) => {
        scaleEl = el;
        el.style.minWidth = "3em";
        el.style.textAlign = "right";
        el.innerText = ` ${this.plugin.settings.scale.toString()}`;
      });


    new Setting(containerEl).setName(i18n.t("setting.Interface Setting")).setHeading();

    new Setting(containerEl)
      .setName(i18n.t("setting.Show Center Button"))
      .setDesc(i18n.t("setting.Located at the bottom right corner of the mind map interface, clicking it will center the screen on the root node."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.centerBtn);
        toggle.onChange(async (value) => {
          this.plugin.settings.centerBtn = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(i18n.t("setting.Show Fit-to-Screen Button"))
      .setDesc(i18n.t("setting.Located at the bottom right corner of the mind map interface, clicking it will fit the screen to just contain all content."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.fitBtn);
        toggle.onChange(async (value) => {
          this.plugin.settings.fitBtn = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(i18n.t("setting.Show Download Button"))
      .setDesc(i18n.t("setting.Located at the bottom right corner of the mind map interface, clicking it will generate a PNG image based on the current view."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.downloadBtn);
        toggle.onChange(async (value) => {
          this.plugin.settings.downloadBtn = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(i18n.t("setting.Show Undo/Redo Buttons"))
      .setDesc(i18n.t("setting.Located at the top right corner of the mind map interface, corresponding to undo and redo actions."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.timetravel);
        toggle.onChange(async (value) => {
          this.plugin.settings.timetravel = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName(i18n.t("setting.Edit Settings")).setHeading();

    new Setting(containerEl)
      .setName(i18n.t("setting.Add Node Button"))
      .setDesc(i18n.t("setting.Display a plus sign when the mouse is near a node."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.addNodeBtn);
        toggle.onChange(async (value) => {
          this.plugin.settings.addNodeBtn = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(i18n.t("setting.Drag Nodes"))
      .setDesc(i18n.t("setting.Disabling this will prevent nodes from being dragged."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.drag);
        toggle.onChange(async (value) => {
          this.plugin.settings.drag = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(i18n.t("setting.Editable"))
      .setDesc(i18n.t("setting.Disabling this will make nodes not editable."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.edit);
        toggle.onChange(async (value) => {
          this.plugin.settings.edit = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(i18n.t("setting.Context Menu"))
      .setDesc(i18n.t("setting.Disabling this will make the right-click menu unavailable."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.contextmenu);
        toggle.onChange(async (value) => {
          this.plugin.settings.contextmenu = value;
          await this.plugin.saveSettings();
        });
      });

      new Setting(containerEl).setName(i18n.t("setting.View Settings")).setHeading();

    new Setting(containerEl)
      .setName(i18n.t("setting.Sharpen Corners"))
      .setDesc(i18n.t("setting.When enabled, nodes will no longer have smooth corners."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.sharpCorner);
        toggle.onChange(async (value) => {
          this.plugin.settings.sharpCorner = value;
          await this.plugin.saveSettings();
        });
      });

    let branchEl: HTMLDivElement;
    new Setting(containerEl)
      .setName(i18n.t("setting.Line Width"))
      .addSlider((silder) => {
        silder.setLimits(1, 6, 1);
        silder.setValue(this.plugin.settings.branch);

        silder.onChange(async (value) => {
          silder.showTooltip();
          this.plugin.settings.branch = value;
          silder.sliderEl.createEl("span", { text: "" });
          branchEl.innerText = ` ${value.toString()}`;
        });
      })
      .settingEl.createDiv("", (el) => {
        branchEl = el;
        el.style.minWidth = "3em";
        el.style.textAlign = "right";
        el.innerText = ` ${this.plugin.settings.branch.toString()}`;
      });

    let xGapEl: HTMLDivElement;
    new Setting(containerEl)
      .setName(i18n.t("setting.Horizontal Spacing"))
      .setDesc(i18n.t("setting.Controls the spacing on the X-axis for each node."))
      .addSlider((silder) => {
        silder.setLimits(0, 100, 1);
        silder.setValue(this.plugin.settings.xGap);
        silder.onChange(async (value) => {
          silder.showTooltip();
          this.plugin.settings.xGap = value;
          silder.sliderEl.createEl("span", { text: "" });
          xGapEl.innerText = ` ${value.toString()}`;
        });
      })
      .settingEl.createDiv("", (el) => {
        xGapEl = el;
        el.style.minWidth = "3em";
        el.style.textAlign = "right";
        el.innerText = ` ${this.plugin.settings.xGap.toString()}`;
      });

    let yGapEl: HTMLDivElement;
    new Setting(containerEl)
      .setName(i18n.t("setting.Vertical Spacing"))
      .setDesc(i18n.t("setting.Controls the spacing on the Y-axis for each node."))
      .addSlider((silder) => {
        silder.setLimits(0, 100, 1);
        silder.setValue(this.plugin.settings.yGap);

        silder.onChange(async (value) => {
          silder.showTooltip();
          this.plugin.settings.yGap = value;
          silder.sliderEl.createEl("span", { text: "" });
          yGapEl.innerText = ` ${value.toString()}`;
        });
      })
      .settingEl.createDiv("", (el) => {
        yGapEl = el;
        el.style.minWidth = "3em";
        el.style.textAlign = "right";
        el.innerText = ` ${this.plugin.settings.yGap.toString()}`;
      });
  }
}
