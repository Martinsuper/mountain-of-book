export const CATEGORIES = ['AI 工程', '开发工具', '软件工程', '应用开发'] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_TREE = {
  'AI 工程': ['Agent 与 AI 编程', 'Skills 与工作流', 'RAG 与知识库', 'LLM 与模型推理', 'AI 内容与研究'],
  '开发工具': ['CLI 与开发环境', '浏览器自动化', '文档与图表'],
  '软件工程': ['架构与代码质量', '测试与协作'],
  '应用开发': ['Web 与客户端', 'Java 与数据', '部署与运行环境']
} as const satisfies Record<Category, readonly string[]>;

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  'AI 工程': 'Agent、LLM、RAG 与 AI 应用实践',
  '开发工具': '开发环境、自动化与文档工具',
  '软件工程': '架构、代码质量、测试与协作方法',
  '应用开发': 'Web、后端、数据与运行环境'
};

export function isSubcategory(category: Category, subcategory: string) {
  return CATEGORY_TREE[category].includes(subcategory as never);
}
