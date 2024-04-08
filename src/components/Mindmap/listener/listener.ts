import style from "../css";
import { ctm, editFlag, selection, textRectPadding, zoomTransform } from "../variable";
import * as d3 from "../d3";
import { type Mdata } from "../interface";
import { fitView, getRelativePos, getSelectedGData, isData, moveNode, moveView, scaleView, selectGNode } from "../assistant";
import { add, addParent, addSibling, changeLeft, collapse, del, delOne, expand, mmdata, moveChild, moveSibling, rename } from "../data";
import { svgEle, gEle, foreignDivEle, wrapperEle, foreignEle, foreignResizableDiv, uploadImageFileInput } from "../variable/element";
import emitter from "@/mitt";
import { getDataId, getSiblingGClass } from "../attribute";
import type { MenuEvent } from "../variable/contextmenu";
import { useAppStore } from "../../../stores/app";
import { isImageNodeValue } from "../draw";
import { useDragBoxStore } from "../../../stores/dragBox";
import md5 from "blueimp-md5";

/**
 * @param this - gContent
 */
export function onMouseEnter(this: SVGGElement): void {
  const temp = this.querySelector<HTMLElement>(`g.${style["add-btn"]}`);
  if (temp) {
    temp.style.opacity = "1";
  }
}

/**
 * @param this - gContent
 */
export function onMouseLeave(this: SVGGElement): void {
  const temp = this.querySelector<HTMLElement>(`g.${style["add-btn"]}`);
  if (temp) {
    temp.style.opacity = "0";
  }
}

export const onZoomMove = (e: d3.D3ZoomEvent<SVGSVGElement, null>): void => {
  const { g } = selection;
  if (!g) {
    return;
  }
  zoomTransform.value = e.transform;
  g.attr("transform", e.transform.toString());
};

export const onSelect = (e: MouseEvent, d: Mdata): void => {
  e.stopPropagation();
  selectGNode(d);
};

/**
 * 进入编辑状态
 * @param this - gText
 */
export function onEdit(this: SVGGElement, _e: MouseEvent, d: Mdata): void {
  const gNode = this.parentNode?.parentNode as SVGGElement;
  const { foreign } = selection;
  const dragBoxStore = useDragBoxStore();
  const appStore = useAppStore();
  if (editFlag && foreign && foreignDivEle.value) {
    gNode.classList.add(style.edited);
    emitter.emit("edit-flag", false);
    foreign
      .attr("x", d.x - 2 - (d.left ? d.width : 0))
      .attr("y", d.y - mmdata.data.y - 2)
      .attr("data-id", d.id)
      .attr("data-name", d.name)
      .style("display", "");

    if (isImageNodeValue(d.name)) {
      foreignDivEle.value.style.display = "none";
      let imageNodeValue = JSON.parse(d.name);
      dragBoxStore.w = imageNodeValue.width;
      dragBoxStore.h = imageNodeValue.height;
      dragBoxStore.show = true;
      dragBoxStore.img = imageNodeValue.src;
      if (imageNodeValue.fileId) {
        let find = appStore.fileIds.find((fileId) => fileId.id === imageNodeValue.fileId);
        if (find) {
          let linkpathDest = appStore.app.metadataCache.getFirstLinkpathDest(`${find.value}`, "/");
          if (linkpathDest) {
            dragBoxStore.img = appStore.app.vault.getResourcePath(linkpathDest);
          }
        }
      }

      foreignDivEle.value.textContent = d.name;
      foreignResizableDiv.value.focus();
    } else {
      const div = foreignDivEle.value;
      div.style.display = "";
      dragBoxStore.show = false;
      div.textContent = d.name;

      div.focus();
      getSelection()?.selectAllChildren(div);
    }

    const gContent = gNode.querySelector<SVGGElement>(`:scope > .${style.content}`);
    if (gContent) {
      //moveView(gContent)
    }
  }
}

export const onEditBlur = (): void => {
  const dragBoxStore = useDragBoxStore();
  document.getElementsByClassName(style.edited)[0]?.classList.remove(style.edited, style.selected);
  if (foreignEle.value && foreignDivEle.value) {
    foreignEle.value.style.display = "none";
    const id = foreignEle.value.getAttribute("data-id");
    const oldname = foreignEle.value.getAttribute("data-name");
    const name = foreignDivEle.value.textContent;
    if (id && name !== null && name !== oldname) {
      rename(id, name);
    }
  }
};

export const onContextmenu = (e: MouseEvent): void => {
  e.preventDefault();
  if (!wrapperEle.value) {
    return;
  }
  const relativePos = getRelativePos(wrapperEle.value, e);
  ctm.pos.value = relativePos;
  const eventTargets = e.composedPath() as SVGElement[];
  const gNode = eventTargets.find((et) => et.classList?.contains("node"));
  if (gNode) {
    const { classList } = gNode;
    const isRoot = classList.contains(style.root);
    const collapseFlag = classList.contains(style["collapse"]);
    if (!classList.contains(style.selected)) {
      selectGNode(gNode as SVGGElement);
    }
    ctm.deleteItem.value.disabled = isRoot;
    ctm.cutItem.value.disabled = isRoot;
    ctm.deleteOneItem.value.disabled = isRoot;
    ctm.addSiblingItem.value.disabled = isRoot;
    ctm.addSiblingBeforeItem.value.disabled = isRoot;
    ctm.addParentItem.value.disabled = isRoot;
    ctm.expandItem.value.disabled = !collapseFlag;
    ctm.collapseItem.value.disabled = collapseFlag || classList.contains("leaf");
    ctm.showViewMenu.value = false;
  } else {
    ctm.showViewMenu.value = true;
  }
  emitter.emit("showContextmenu", true);
};

export const onClickMenu = (name: MenuEvent): void => {
  switch (name) {
    case "zoomfit":
      fitView();
      break;
    case "zoomin":
      scaleView(true);
      break;
    case "zoomout":
      scaleView(false);
      break;
    case "add":
      addAndEdit(new MouseEvent("click"), getSelectedGData());
      break;
    case "delete":
      del(getSelectedGData().id);
      break;
    case "delete-one":
      delOne(getSelectedGData().id);
      break;
    case "collapse":
      collapse(getSelectedGData().id);
      break;
    case "expand":
      expand(getSelectedGData().id);
      break;
    case "add-sibling":
      {
        const seleData = getSelectedGData();
        const d = addSibling(seleData.id, "");
        if (d) {
          edit(d);
        }
      }
      break;
    case "add-sibling-before":
      {
        const seleData = getSelectedGData();
        const d = addSibling(seleData.id, "", true);
        if (d) {
          edit(d);
        }
      }
      break;
    case "add-parent":
      {
        const seleData = getSelectedGData();
        const d = addParent(seleData.id, "");
        if (d) {
          edit(d);
        }
      }
      break;
    case "cut":
      {
        const { id } = getSelectedGData();
        const rawdata = mmdata.find(id)?.rawData;
        if (rawdata) {
          // navigator.clipboard.write
          navigator.clipboard.writeText(JSON.stringify(rawdata));
        }
        del(id);
      }
      break;
    case "copy":
      {
        const seleData = getSelectedGData();
        const rawdata = mmdata.find(seleData.id)?.rawData;
        if (rawdata) {
          // navigator.clipboard.write
          navigator.clipboard.writeText(JSON.stringify(rawdata));
        }
      }
      break;
    case "paste":
      {
        const seleData = getSelectedGData();
        navigator.clipboard.readText().then((clipText) => {
          const rawdata = isData(clipText) || { name: clipText };
          add(seleData.id, rawdata);
        });
      }
      break;
    case "add-image":
      {
        const appStore = useAppStore();
        const seleData = getSelectedGData();
        if (uploadImageFileInput.value) {
          uploadImageFileInput.value.onchange = (event) => {
            //@ts-ignore
            const file = event.target.files[0];
            const reader = new FileReader();

            reader.onload = async () => {
              const binaryData = reader.result as ArrayBuffer;
              if (appStore.app && binaryData) {
                //@ts-ignore
                let basePath = appStore.app.vault.adapter.basePath;
                let reg = new RegExp("^" + basePath.replace(/\\/g, "\\\\"));
                let filePath = file.path.replace(reg, "");
                if (await appStore.app.vault.adapter.exists(filePath)) {
                  let linkPath = filePath.replace(/^\\/, "").replace(/\\/g, "/");
                  let xc = appStore.app.vault.getResourcePath(appStore.app.metadataCache.getFirstLinkpathDest(`${linkPath}`, ""));
                  let imgSize = scaleImageToThreshold(await getImageSize(xc), 100);
                  let data = {
                    src: xc,
                    width: imgSize.width,
                    height: imgSize.height,
                    fileId: createNewFileId(appStore.fileIds.map((fileId) => fileId.id)),
                  };

                  appStore.fileIds.push({
                    id: data.fileId,
                    value: linkPath,
                  });

                  rename(seleData.id, JSON.stringify(data));
                } else {
                  let filename = `${generateImageFileName()}.${file.name.split(".").pop().toLowerCase() ?? "jpg"}`;
                  await appStore.app.vault.adapter.writeBinary(`/${filename}`, binaryData);
                  let xc = appStore.app.vault.getResourcePath(appStore.app.metadataCache.getFirstLinkpathDest(`${filename}`, ""));
                  let imgSize = scaleImageToThreshold(await getImageSize(xc), 100);
                  let data = {
                    src: xc,
                    width: imgSize.width,
                    height: imgSize.height,
                    fileId: createNewFileId(appStore.fileIds.map((fileId) => fileId.id)),
                  };

                  appStore.fileIds.push({
                    id: data.fileId,
                    value: filename,
                  });

                  rename(seleData.id, JSON.stringify(data));
                }
              }
              (event.target as HTMLInputElement).value = "";
              return;
            };

            reader.readAsArrayBuffer(file);
          };
          uploadImageFileInput.value.click();
        }
      }
      break;
      case "clean":
        {
          const seleData = getSelectedGData();
          rename(seleData.id, "");
        }
        break;
    default:
      break;
  }
};

function createNewFileId(fileIds: string[]): string {
  let newFileId;
  do {
    newFileId = md5(Date());
  } while (fileIds.includes(newFileId));
  return newFileId;
}

function scaleImageToThreshold(imgSize: any, threshold: number) {
  let scaledWidth, scaledHeight;

  if (imgSize.width > imgSize.height) {
    scaledWidth = threshold;
    scaledHeight = (imgSize.height / imgSize.width) * threshold;
  } else {
    scaledHeight = threshold;
    scaledWidth = (imgSize.width / imgSize.height) * threshold;
  }
  return { width: scaledWidth, height: scaledHeight };
}

function getScale(w: number, h: number, value: number): number {
  if (w >= h) {
    return w / value;
  } else {
    return h / value;
  }
}

function getImageSize(url: string) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = (error) => {
      reject(error);
    };
    img.src = url;
  });
}

function generateImageFileName() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  const hours = String(currentDate.getHours()).padStart(2, "0");
  const minutes = String(currentDate.getMinutes()).padStart(2, "0");
  const seconds = String(currentDate.getSeconds()).padStart(2, "0");
  const milliseconds = String(currentDate.getMilliseconds()).padStart(3, "0");

  return `Pasted Image ${year}${month}${day}${hours}${minutes}${seconds}_${milliseconds}`;
}

/**
 * 添加子节点并进入编辑模式
 */
export const addAndEdit = (e: MouseEvent, d: Mdata): void => {
  const child = add(d.id, "");
  if (child) {
    edit(child, e);
  }
};

/**
 * 选中节点进入编辑模式
 */
export function edit(d: Mdata, e = new MouseEvent("click")): void {
  const { g } = selection;
  if (!g) {
    return;
  }
  const gText = g.selectAll<SVGGElement, Mdata>(`g[data-id='${getDataId(d)}'] > g.${style.content} > g.${style.text}`);
  const node = gText.node();

  if (node) {
    emitter.emit("edit-flag", true);
    onEdit.call(node, e, d);
  }
}

export const onClickExpandBtn = (e: MouseEvent, d: Mdata): void => {
  expand(d.id);
};

/**
 * @param this - gText
 */
export function onDragMove(this: SVGGElement, e: d3.D3DragEvent<SVGGElement, Mdata, Mdata>, d: Mdata): void {
  const gNode = this.parentNode?.parentNode as SVGGElement;
  if (svgEle.value) {
    svgEle.value.classList.add(style.dragging);
  }
  const { g } = selection;
  if (!g) {
    return;
  }
  moveNode(gNode, d, [e.x - d.x, e.y - d.y]);
  // 鼠标相对gEle左上角的位置
  const mousePos = d3.pointer(e, gEle.value);
  mousePos[1] += mmdata.data.y;

  const temp = g.selectAll<SVGGElement, Mdata>("g.node").filter((other) => {
    if (other !== d && other !== d.parent && !other.id.startsWith(d.id)) {
      let diffx0 = textRectPadding;
      let diffx1 = other.width + textRectPadding;
      if (other.left && other.depth !== 0) {
        [diffx0, diffx1] = [diffx1, diffx0];
      }
      const rect = {
        x0: other.x - diffx0,
        x1: other.x + diffx1,
        y0: other.y - textRectPadding,
        y1: other.y + other.height + textRectPadding,
      };

      return mousePos[0] > rect.x0 && mousePos[1] > rect.y0 && mousePos[0] < rect.x1 && mousePos[1] < rect.y1;
    }
    return false;
  });
  const old = Array.from(document.getElementsByClassName(style.outline));
  const n = temp.node();
  old.forEach((o) => {
    if (o !== n) {
      o.classList.remove(style.outline);
    }
  });
  n?.classList.add(style.outline);
}

/**
 * @param this - gText
 */
export function onDragEnd(this: SVGGElement, e: d3.D3DragEvent<SVGGElement, Mdata, Mdata>, d: Mdata): void {
  const gNode = this.parentNode?.parentNode as SVGGElement;
  if (svgEle.value) {
    svgEle.value.classList.remove(style.dragging);
  }
  // 判断是否找到了新的父节点
  const np = document.getElementsByClassName(style.outline)[0];
  if (np) {
    np.classList.remove(style.outline);
    const pid = np.getAttribute("data-id");
    if (pid) {
      d.px = 0;
      d.py = 0;
      moveChild(pid, d.id);
    } else {
      throw new Error("outline data-id null");
    }
    return;
  }
  // 判断是否变换left
  const xToCenter = d.x - mmdata.getRootWidth() / 2;
  const lr = d.depth === 1 && xToCenter * (xToCenter + d.px) < 0;
  const getSameSide = lr ? (a: Mdata) => a.left !== d.left : (a: Mdata) => a.left === d.left;
  // 判断是否需要调换节点顺序
  const p = gNode.parentNode as SVGGElement;
  let downD = lr ? { y: Infinity, id: d.id } : d;
  let upD = lr ? { y: -Infinity, id: d.id } : d;
  const brothers = d3
    .select<SVGGElement, Mdata>(p)
    .selectAll<SVGGElement, Mdata>(`g.${getSiblingGClass(d).join(".")}`)
    .filter((a) => a !== d && getSameSide(a));
  const endY = d.y + d.py;
  brothers.each((b) => {
    if ((lr || b.y > d.y) && b.y < endY && b.y > upD.y) {
      upD = b;
    } // 找新哥哥节点
    if ((lr || b.y < d.y) && b.y > endY && b.y < downD.y) {
      downD = b;
    } // 找新弟弟节点
  });
  if (downD.id !== d.id) {
    d.px = 0;
    d.py = 0;
    moveSibling(d.id, downD.id);
  } else if (upD.id !== d.id) {
    d.px = 0;
    d.py = 0;
    moveSibling(d.id, upD.id, 1);
  } else if (lr) {
    d.px = 0;
    d.py = 0;
    changeLeft(d.id);
  } else {
    // 复原
    moveNode(gNode, d, [0, 0], 500);
  }
}
