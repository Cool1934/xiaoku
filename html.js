// 导出完整前端 HTML 字符串（与 public/index.html 内容一致），供 Worker 内嵌兜底，
// 确保无论 public/ 是否被 Worker 正确解析，返回的页面都是完整的。
import fs from "node:fs"; import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
let cached = "";
export function getHTML() {
  if (cached) return cached;
  try { const here = dirname(fileURLToPath(import.meta.url)); cached = fs.readFileSync(join(here, "public", "index.html"), "utf8"); return cached; }
  catch (_) { return ""; }
}
