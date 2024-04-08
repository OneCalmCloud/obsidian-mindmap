import zhCN from "./locale/zh-cn";
import en from "./locale/en";

import { moment } from "obsidian";

const localeMap: { [k: string]: Partial<typeof en> } = {
  en: en,
  zh: zhCN,
  "zh-cn": zhCN,
};

let lang = moment.locale();
if (!localeMap[lang]) {
  lang = "en";
}
const locale = localeMap[lang];

export function t(str: keyof typeof en): string {
  if (!locale) {
    console.error("Error: Mindmap locale not found", lang);
  }

  return (locale && locale[str]) || en[str];
}
