<template>
  <div :class="style['container']">
    <div :id="style['svg-wrapper']" style="z-index: 9999" ref="wrapperEle" :scale="props.scale">
      <svg :class="style['svg']" ref="svgEle" :style="{ backgroundColor: props.bgColor }">
        <g ref="gEle">
          <foreignObject ref="foreignEle" style="display: none">
            <div class="div-input" ref="foreignDivEle" contenteditable></div>
            <div ref="foreignResizableDiv" style="cursor: default; outline: none; caret-color: transparent" contenteditable>
              <VueDraggableResizable class-name-handle="draggable-resizable-handle" v-if="dragBoxStore.show" :active="dragBoxStore.active" :preventDeactivation="true" @resizeStop="dragBoxStopResizing" @resizing="dragBoxResize" :draggable="false" :lock-aspect-ratio="true" :w="dragBoxStore.w" :h="dragBoxStore.h">
                <img :src="dragBoxStore.img" style="width: 100%" />
              </VueDraggableResizable>
            </div>
          </foreignObject>
        </g>
      </svg>
    </div>
    <svg ref="asstSvgEle" :class="style['asst-svg']"></svg>
    <div :class="[style['button-list'], style['right-bottom']]" style="padding-bottom: 32px">
      <button v-if="centerBtn" @click="centerView()"><i :class="style['gps']"></i></button>
      <button v-if="fitBtn" @click="fitView()"><i :class="style['fit']"></i></button>
      <button v-if="downloadBtn" @click="download()"><i :class="style['download']"></i></button>
    </div>
    <div v-if="timetravel" :class="[style['button-list'], style['right-top']]">
      <button @click="prev" :class="{ [style['disabled']]: !hasPrev }"><i :class="style['prev']"></i></button>
      <button @click="next" :class="{ [style['disabled']]: !hasNext }"><i :class="style['next']"></i></button>
    </div>
    <contextmenu v-if="ctm" :position="contextmenuPos" :groups="menu" @click-item="onClickMenu"></contextmenu>
  </div>
  <input ref="uploadImageFileInput" style="display: none" type="file" name="fileInput" accept=".jpg, .png" />
</template>

<script lang="ts">
import emitter from "../../mitt";
import type { Data, Locale, TwoNumber } from "./interface";
import style from "./css";
import * as d3 from "./d3";
import { afterOperation, ImData, mmdata } from "./data";
import { hasNext, hasPrev } from "./state";
import { fitView, getSize, centerView, next, prev, download, bindForeignDiv, restoreView } from "./assistant";
import { xGap, yGap, branch, scaleExtent, ctm, selection, changeSharpCorner, addNodeBtn, mmprops } from "./variable";
import { wrapperEle, svgEle, gEle, asstSvgEle, foreignEle, foreignDivEle, foreignResizableDiv, uploadImageFileInput } from "./variable/element";
import { draw } from "./draw";
import { switchZoom, switchEdit, switchSelect, switchContextmenu, switchDrag, onClickMenu } from "./listener";
import Contextmenu from "../Contextmenu.vue";
import cloneDeep from "lodash.clonedeep";
import i18next from "../../i18n";
import VueDraggableResizable from "vue-draggable-resizable";
import { useDragBoxStore } from "../../stores/dragBox";
import { useAppStore } from "../../stores/app";
import { onEditBlur } from "./listener/listener";
import * as d3ScaleChromatic from "d3-scale-chromatic";
import * as d3Scale from "d3-scale";
import { PropType, defineComponent, nextTick, onMounted, ref, watch, watchEffect } from "vue";

export default defineComponent({
  name: "Mindmap",
  components: {
    Contextmenu,
    VueDraggableResizable,
  },
  emits: ["update:modelValue"],
  props: {
    modelValue: {
      type: Array as PropType<Data[]>,
      required: true,
    },
    activeLeafId: { type: String, default: null },
    // 绘制所需的变量
    xGap: { type: Number, default: xGap },
    yGap: { type: Number, default: yGap },
    branch: {
      type: Number,
      default: branch,
      validator: (val: number) => val >= 1 && val <= 6,
    },
    scaleExtent: {
      type: Object as PropType<TwoNumber>,
      default: scaleExtent,
    },
    sharpCorner: Boolean,
    // 操作许可
    centerBtn: Boolean,
    fitBtn: Boolean,
    downloadBtn: Boolean,
    timetravel: Boolean,
    addNodeBtn: Boolean,
    edit: Boolean,
    drag: Boolean,
    keyboard: Boolean,
    ctm: Boolean,
    zoom: Boolean,
    scale: { type: Number, default: 9 },
    // i18n
    locale: { type: String as PropType<Locale>, default: "zh" },
    bgColor: {
      type: String,
      default: "white",
    },
  },
  setup(props, context) {
    const appStore = useAppStore();
    // 立即执行
    watchEffect(() => i18next.changeLanguage(props.locale));
    watchEffect(() => emitter.emit("scale-extent", props.scaleExtent));
    watchEffect(() => emitter.emit("branch", props.branch));
    watchEffect(() => emitter.emit("sharp-corner", props.sharpCorner));
    watchEffect(() => emitter.emit("gap", { xGap: props.xGap, yGap: props.yGap }));
    watchEffect(() => emitter.emit("mindmap-context", context));
    watchEffect(() => (addNodeBtn.value = props.edit && props.addNodeBtn));
    watchEffect(() => (mmprops.value.drag = props.drag));
    watchEffect(() => (mmprops.value.edit = props.edit));
    // onMounted
    onMounted(() => {
      if (!svgEle.value || !gEle.value || !asstSvgEle.value || !foreignEle.value || !foreignDivEle.value) {
        return;
      }
      emitter.emit("selection-svg", d3.select(svgEle.value));
      emitter.emit("selection-g", d3.select(gEle.value));
      emitter.emit("selection-asstSvg", d3.select(asstSvgEle.value));
      emitter.emit("selection-foreign", d3.select(foreignEle.value));
      emitter.emit("mmdata", new ImData(cloneDeep(props.modelValue[0]), xGap, yGap, getSize, d3Scale.scaleOrdinal(["#FF9B8C", "#FFF7AB", "#ACEBBA", "#B2E1FF", "#DBC0FF"])));

      changeSharpCorner.value = false;
      afterOperation();
      const { svg, foreign } = selection;
      foreign?.raise();
      bindForeignDiv();

      let activeViewTransform = appStore.viewTransforms.find((viewTransorm) => viewTransorm.leafId === props.activeLeafId);
      if (activeViewTransform) {
        restoreView(activeViewTransform.transform);
      } else {
        fitView();
      }

      svg?.on("mousedown", () => {
        const oldSele = document.getElementsByClassName(style.selected)[0];
        oldSele?.classList.remove(style.selected);
      });
      switchZoom(props.zoom);
      switchContextmenu(props.ctm);
    });

    // watch
    watch(
      () => [props.branch, addNodeBtn.value, props.sharpCorner],
      () => {
        draw();
        changeSharpCorner.value = false;
      }
    );
    watch(
      () => [props.xGap, props.yGap],
      (val) => {
        mmdata.setBoundingBox(val[0], val[1]);
        draw();
      }
    );
    watch(
      () => [props.drag, props.edit],
      (val) => {
        switchSelect(val[0] || val[1]);
        switchDrag(val[0]);
        switchEdit(val[1]);
      }
    );
    watch(
      () => props.zoom,
      (val) => switchZoom(val)
    );
    watch(
      () => props.ctm,
      (val) => switchContextmenu(val)
    );
    const dragBoxStore = useDragBoxStore();

    function dragBoxDeactive() {
      if (!dragBoxStore.resizing) {
        if (foreignDivEle.value && foreignDivEle.value.textContent) {
          let data = JSON.parse(foreignDivEle.value.textContent);
          if (data) {
            data.width = dragBoxStore.w;
            data.height = dragBoxStore.h;
            foreignDivEle.value.textContent = JSON.stringify(data);
            onEditBlur();
            dragBoxStore.show = false;
          }
        }
      }
    }

    function dragBoxStopResizing() {
      if (foreignDivEle.value && foreignDivEle.value.textContent) {
        let data = JSON.parse(foreignDivEle.value.textContent);
        if (data) {
          data.width = dragBoxStore.w;
          data.height = dragBoxStore.h;
          foreignDivEle.value.textContent = JSON.stringify(data);
          dragBoxStore.resizing = false;
          onEditBlur();
          dragBoxStore.show = false;
        }
      }
    }

    function dragBoxResize(left: number, top: number, width: number, height: number) {
      dragBoxStore.w = width;
      dragBoxStore.h = height;
    }

    return {
      wrapperEle,
      svgEle,
      gEle,
      style,
      asstSvgEle,
      foreignEle,
      foreignDivEle,
      centerView,
      fitView,
      download,
      menu: ctm.menu,
      contextmenuPos: ctm.pos,
      onClickMenu,
      next,
      prev,
      hasPrev,
      hasNext,
      props,
      dragBoxStore,
      dragBoxDeactive,
      dragBoxResize,
      dragBoxStopResizing,
      foreignResizableDiv,
      uploadImageFileInput,
    };
  },
});
</script>

<style>
.div-input {
  display: inline-block;
  outline: none;
  width: max-content;
  min-width: 22px;
  padding: 1px;
  white-space: pre;
}

.vdr {
  touch-action: none;
  position: absolute;
  box-sizing: border-box;
  border: 1px dashed black;
}
.draggable-resizable-handle {
  box-sizing: border-box;
  position: absolute;
  width: 10px;
  height: 10px;
  background: #eee;
  border: 1px solid #333;
}
.draggable-resizable-handle-tl {
  top: -10px;
  left: -10px;
  cursor: nw-resize;
}
.draggable-resizable-handle-tm {
  top: -10px;
  left: 50%;
  margin-left: -5px;
  cursor: n-resize;
}
.draggable-resizable-handle-tr {
  top: -10px;
  right: -10px;
  cursor: ne-resize;
}
.draggable-resizable-handle-ml {
  top: 50%;
  margin-top: -5px;
  left: -10px;
  cursor: w-resize;
}
.draggable-resizable-handle-mr {
  top: 50%;
  margin-top: -5px;
  right: -10px;
  cursor: e-resize;
}
.draggable-resizable-handle-bl {
  bottom: -10px;
  left: -10px;
  cursor: sw-resize;
}
.draggable-resizable-handle-bm {
  bottom: -10px;
  left: 50%;
  margin-left: -5px;
  cursor: s-resize;
}
.draggable-resizable-handle-br {
  bottom: -10px;
  right: -10px;
  cursor: se-resize;
}
@media only screen and (max-width: 768px) {
  [class*="draggable-resizable-handle-"]:before {
    content: "";
    left: -10px;
    right: -10px;
    bottom: -10px;
    top: -10px;
    position: absolute;
  }
}
</style>
