import { CATEGORIES, CATEGORY_TREE } from './taxonomy.js';

/**
 * 5 类文章骨架（CLAUDE.md §2.3）。
 * 正文首个 ## 直接是骨架第一项，不重复文章标题。
 */
export const SKELETONS: Record<string, string[]> = {
  项目评介型: [
    '## 简介',
    '## 项目概览',
    '## 背景与动机',
    '## 快速上手',
    '## 架构与原理',
    '## 适用场景与局限',
    '## 参考资料',
  ],
  操作教程型: [
    '## 目标',
    '## 前置条件',
    '## 操作步骤',
    '## 结果验证',
    '## 常见问题',
    '## 参考资料',
  ],
  问题排查型: [
    '## 问题现象',
    '## 原因分析',
    '## 解决方法',
    '## 验证',
    '## 延伸场景',
    '## 参考资料',
  ],
  原理解析型: [
    '## 概述',
    '## 整体架构',
    '## 核心机制',
    '## 设计考量',
    '## 局限与边界',
    '## 参考资料',
  ],
  速查清单型: [
    '## 适用范围',
    '## 速查表',
    '## 分主题详解',
    '## 实践建议',
    '## 参考资料',
  ],
};

export function renderSkeleton(name: string): string {
  const skeleton = SKELETONS[name];
  if (!skeleton) return '';
  // 带 * 的可选段在模板里直接去掉（CLAUDE.md 中 * 为可选），其余章节间用 --- 分隔
  return skeleton.join('\n\n---\n\n') + '\n';
}

/**
 * 风格指南（供 get_style_guide 工具返回，agent 据此写作）。
 */
export function styleGuideText(): string {
  return `# 书山有路写作规范速查

## Frontmatter（必读）
- title: 双引号包裹，不超过 50 字
- description: 双引号包裹，建议 100-200 字，用于 SEO 和列表展示
- date: YYYY-MM-DD（裸日期，不加引号）
- category（可选，一篇一个分类），合法值只有 4 个: ${CATEGORIES.join(' / ')}
- subcategory（设置 category 时必填），每个分类的合法值:
${Object.entries(CATEGORY_TREE).map(([c, subs]) => `  - ${c}: ${subs.join(' / ')}`).join('\n')}
- tags: 小写英文或拼音，多词用连字符（如 sequence-diagram），建议 1-5 个
- draft: 新文章默认 true；publish 工具会设为 false

## 通用文件规则
- slug/文件名：小写英文/数字 + 连字符（如 maven-settings-xml-config.md），不要日期、不要大写、不要中文
- 正文从 ## 开始，不用 #；最深到 ####
- 各 ## 章节之间用 --- 分隔线（推荐）
- 文末收尾段统一为「## 参考资料」

## 四条结构原则
1. 价值前置：开头一段讲清「这是什么」+「读完能得到什么」，30 秒可判断
2. 结论先行：先给全貌/结论再展开细节
3. 可跳读：每个 ## 是独立信息单元，标题写有信息量的短语
4. 行动闭环：结尾给下一步行动/延伸/作者判断，不用复述式总结收尾

## 写作意图与骨架（一篇选一个）
${Object.entries(SKELETONS).map(([name, sections]) => `${name}: ${sections.join(' / ')}`).join('\n')}

## 语气红线（CLAUDE.md §2.12）
- 禁营销话术：不说「强烈推荐/核心优势/适合人群/值得一试」
- 禁「是否适合用 X」推荐表；能力边界用中性能力清单陈述
- 禁拉踩竞品、禁过度修辞（用数据代替形容词，如「少 90% token」）
- 开头禁三段式铺垫/反问/金句；第一段前两句必须进入「它是什么/解决什么」
- 正文不用装饰性 emoji（✅❌⚠️✨💡）

## 配图优先
- 流程/步骤 → PlantUML 活动图或时序图；架构/组件 → 组件图；调用交互 → 时序图
- 项目评介型/原理解析型至少一张架构或流程图
- 图已表达的内容不要再用文字复述
- PlantUML 代码块必须含 @startuml/@enduml，写完后调用 check_plantuml 工具验证

## 代码块
- 始终指定语言标识符；目录树/纯文本输出用 text，XML/HTML 用 xml/html
`;
}
