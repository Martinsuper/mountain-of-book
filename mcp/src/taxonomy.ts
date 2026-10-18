/**
 * 分类事实来源：与 src/lib/categories.ts 保持一致。
 * ⚠️ 单一事实来源在 src/lib/categories.ts（含校验 schema）。
 * 本文件只是它的镜像副本。mcp/test/smoke.mjs 里有 drift 检测，
 * 两边不一致时冒烟测试会失败——修改任何一侧后请同步另一侧。
 */
export const CATEGORIES = ['AI 工程', '开发工具', '软件工程', '应用开发'] as const;

export const CATEGORY_TREE: Record<string, string[]> = {
  'AI 工程': ['Agent 与 AI 编程', 'Skills 与工作流', 'RAG 与知识库', 'LLM 与模型推理', 'AI 内容与研究'],
  '开发工具': ['CLI 与开发环境', '浏览器自动化', '文档与图表'],
  '软件工程': ['架构与代码质量', '测试与协作'],
  '应用开发': ['Web 与客户端', 'Java 与数据', '部署与运行环境'],
};

export function isSubcategory(category: string, subcategory: string): boolean {
  return CATEGORY_TREE[category]?.includes(subcategory) ?? false;
}
