<template>
  <mindmap v-if="data[0] && props.sdf" :locale="props.local" :activeLeafId="props.activeLeafId" :key="mk" v-model="data" :branch="props.settings.branch" :x-gap="props.settings.xGap" :y-gap="props.settings.yGap" :zoom="props.settings.zoom" :fit-btn="props.settings.fitBtn" :center-btn="props.settings.centerBtn" :download-btn="props.settings.downloadBtn" :drag="props.settings.drag" :edit="props.settings.edit" :add-node-btn="props.settings.addNodeBtn" :sharp-corner="props.settings.sharpCorner" :ctm="props.settings.contextmenu" :timetravel="props.settings.timetravel" @update:model-value="onChange" :bg-color="props.settings.backgroundColor" />
</template>

<script lang="ts" setup>
import learn from "../learn.json";
import Mindmap from "./Mindmap";
import type { Locale } from "./Mindmap/interface";
import { reactive, ref, defineProps, defineEmits, watch, onMounted, PropType } from "vue";
import { fitView, restoreView } from "./Mindmap/assistant";
import "vue-draggable-resizable/style.css";
import { useAppStore, type FileIds, type FileId } from "../stores/app";
import { selection, zoom, zoomTransform } from "./Mindmap/variable";
import * as d3 from "./Mindmap/d3";

const appStore = useAppStore();
const mk = ref(1);
//const data = defineModel("modelValue", { type: Object, default: learn });

interface MyPluginSettings {
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

const props = defineProps({
  data: { type: Object, default: learn },
  go: { type: Number, default: 0 },
  onUpdate2: { type: Function },
  onZoomChange: { type: Function },
  fileIds: { type: Array as PropType<FileIds>, default: [] },
  sdf: { type: Boolean, default: false },
  activeLeafId: { type: String, default: null },
  local: { type: String as PropType<Locale>, default: "en" },
  settings: {
    type: Object as PropType<MyPluginSettings>,
    default: {
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
    },
  },
});

// const emit = defineEmits<{
//   testd: [data: object];
//   zoomChange: { data: object };
// }>();
const emit = defineEmits<{
  (e: "update2", data: object, fileIds: any): void;
  (e: "zoomChange", value: string): void;
}>();

const data = ref<any>([]);

watch(
  () => props.data,
  (value) => {
    mk.value++;
    data.value[0] = value;
  }
);

watch(
  () => props.fileIds,
  (value) => {
    mergeFileIds(value);
    //appStore.fileIds = value;
    appStore.limitFileIdsLength();
  }
);

function mergeFileIds(value: FileIds) {
  appStore.fileIds = appStore.fileIds.concat(value).reduce((acc: FileIds, obj) => {
    let find = acc.find((item) => item.id === obj.id);
    if (!find) {
      acc.push(obj);
    } else {
      find.value = obj.value;
    }
    return acc;
  }, []);
}

watch(
  () => props.go,
  (value) => {
    if (value <= 10) mk.value++;
  }
);

zoom.on("zoom", (e: d3.D3ZoomEvent<SVGSVGElement, null>) => {
  const { g } = selection;
  if (!g) {
    return;
  }
  zoomTransform.value = e.transform;
  g.attr("transform", e.transform.toString());

  emit("zoomChange", e.transform.toString());
});


const onChange = (value: any) => {
  emit("update2", data.value[0], appStore.fileIds);
};

</script>
