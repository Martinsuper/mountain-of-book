---
title: "MiMoCode：带跨会话记忆的开源 AI 编程智能体"
description: "详细介绍小米开源的 MiMoCode 终端 AI 编程助手，涵盖持久化记忆、智能上下文管理、多智能体协作、自我进化等核心特性，以及安装配置与使用体验"
date: 2026-06-11
tags: ["ai", "coding-agent", "mimocode", "open-source", "developer-tools"]
draft: false
---

## MiMoCode：带跨会话记忆的开源 AI 编程智能体

AI 编程助手已经不稀奇了——Claude Code、Cursor、GitHub Copilot 各有千秋。但有一个痛点始终存在：**每次新开一个会话，AI 就忘了你是谁、项目长什么样、上次聊到哪了**。

小米 MiMo 团队最近开源了一款名为 **MiMoCode** 的终端 AI 编程助手，直击这个痛点。它的核心卖点就一句话：**跨会话持久记忆 + 自我进化**。

---

## 项目速览

| 项目 | 信息 |
|------|------|
| 名称 | MiMoCode |
| 仓库 | [XiaomiMiMo/MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code) |
| 官网 | [mimo.xiaomi.com/mimocode](https://mimo.xiaomi.com/en/mimocode) |
| 协议 | MIT License |
| 出品 | 小米 MiMo 团队 |
| 基础 | 基于 [OpenCode](https://github.com/anomalyco/opencode) fork |
| 安装 | `curl -fsSL https://mimo.xiaomi.com/install \| bash` 或 `npm install -g @mimo-ai/cli` |

---

## 为什么值得关注

市面上终端 AI 编程工具不少，MiMoCode 的差异化在于：

1. **持久化记忆** — 跨会话记住项目知识、架构决策、你的编码偏好，下次打开不需要重新教它
2. **智能上下文管理** — 自动检查点 + 上下文重建，长对话也不怕丢信息
3. **自我进化** — `/dream` 从历史会话提炼知识，`/distill` 把重复工作流打包成可复用技能
4. **零配置开箱** — 内置 MiMo Auto 限时免费通道，不需要任何 API Key 就能用
5. **完全开源** — MIT 协议，可自由修改和部署

---

## 安装与快速开始

### 方式一：一键安装（推荐）

```bash
curl -fsSL https://mimo.xiaomi.com/install | bash
```

### 方式二：npm 安装

```bash
npm install -g @mimo-ai/cli
```

首次启动会进入配置向导，支持四种接入方式：

| 方式 | 说明 |
|------|------|
| **MiMo Auto** | 限时免费，匿名通道，零配置直接用 |
| **小米 MiMo 平台** | OAuth 登录，使用小米官方模型服务 |
| **从 Claude Code 导入** | 一键迁移已有配置，老用户无痛切换 |
| **自定义 Provider** | 接入任何 OpenAI 兼容 API（OpenAI、Anthropic、本地 Ollama 等） |

---

## 多智能体模式

MiMoCode 内置三个主智能体，按 `Tab` 键切换：

### build — 主力开发

默认模式，拥有**完整工具权限**（读写文件、运行命令、Git 操作等）。日常写代码、修 bug、重构，用这个就行。

### plan — 只读分析

**只读模式**，不会修改任何文件。适合在项目初期探索代码结构、分析依赖关系、设计解决方案。相当于让 AI 先"看懂"项目再动手。

### compose — 编排工作流

规格驱动开发模式。内置规划、执行、代码评审、TDD、调试、验证、合并等技能，编排从需求到代码交付的完整生命周期。适合大型功能的系统化开发。

> 除主智能体外，系统还会根据需要**自动创建子智能体**，它们共享当前会话上下文，可以并行工作。

---

## 持久化记忆系统（核心亮点）

这是 MiMoCode 最核心的差异化能力。记忆系统基于 **SQLite FTS5 全文搜索**，分为四个层次：

### 项目记忆（MEMORY.md）

持久化的项目知识文件，记录：

- 项目架构和技术栈
- 编码规范和约定
- 常见问题和解决方案
- 你的个人偏好

类似 Claude Code 的 `CLAUDE.md`，但 MiMoCode 的项目记忆可以**自动更新**——通过 `/dream` 命令从历史会话中提炼新知识、清理过时条目。

### 会话检查点（checkpoint.md）

由 **checkpoint-writer 子智能体**自动维护的结构化状态快照。它会根据模型上下文窗口大小，自动决定何时保存当前会话状态——你不需要手动管理。

### 临时笔记（notes.md）

智能体的临时记录区，用于存放调试过程中的中间结论、待验证的假设等。

### 任务进度（tasks/\<id\>/progress.md）

树形任务系统的每个任务都有独立的进度日志，会话恢复时自动加载。

**关键体验**：会话恢复时，所有记忆内容会**自动注入上下文**，智能体不需要重新学习项目背景，直接接着上次的进度继续工作。

---

## 智能上下文管理

长对话最怕的就是"上下文溢出"——AI 忘了前面说的话。MiMoCode 的解决方案：

1. **自动检查点** — 实时监测上下文使用量，在接近限制前自动保存状态
2. **上下文重建** — 溢出时，从最近的检查点 + 项目记忆 + 任务进度 + 保留的近期消息重建上下文
3. **预算注入** — 用 token 预算控制多少记忆内容进入上下文，并按重要性排序，优先保留关键信息

这意味着你可以在一个复杂任务上**连续工作数小时**，不用担心上下文丢失。

---

## 树形任务追踪

MiMoCode 的任务系统不是简单的 TODO 列表，而是**树形结构**：

```
T1 — 实现用户认证模块
├── T1.1 — 设计数据库 Schema
├── T1.2 — 实现注册接口
│   ├── T1.2.1 — 参数校验
│   └── T1.2.2 — 密码加密
└── T1.3 — 实现登录接口
```

任务进度自动与检查点系统集成，会话中断后恢复，任务状态完整保留。

---

## Goal 停止条件

自主工作时，AI 助手容易出现"过早乐观停止"——以为任务完成了，其实还有遗漏。

`/goal` 命令可以设置会话的停止条件。当智能体尝试停止时，一个**独立的 judge 模型**会评估对话内容，判断目标是否真正达成。未达成则继续工作，避免"半吊子"交付。

```
/goal 所有测试通过且代码覆盖率达到 80%
```

---

## 自我进化：Dream & Distill

这是 MiMoCode 最有意思的两个命令：

### /dream — 知识提炼

扫描近期会话痕迹，从中提取持久知识写入项目记忆，同时清理过时条目。类似于人类"睡觉时整理记忆"的过程。

### /distill — 工作流提炼

分析近期工作中反复出现的手动操作模式，将高置信度的候选项打包为：

- **可复用技能**（Skills）
- **子智能体**（Subagents）
- **自定义命令**

用得越多，MiMoCode 就越懂你的工作习惯，效率越高。

---

## 语音输入

通过 `/voice` 激活，由 **TenVAD**（语音活动检测）+ **MiMo ASR**（语音识别）驱动的实时流式语音输入。音频按停顿自动分段，增量转写到输入框——适合在思考时口述需求。

---

## 配置

项目级配置文件：`.mimocode/mimocode.json`
全局配置文件：`~/.config/mimocode/mimocode.json`

常用配置项：

| 配置项 | 说明 |
|--------|------|
| Provider / Model | 选择模型提供商和具体模型 |
| Agent 权限 | 自定义智能体的工具权限 |
| Checkpoint 行为 | 调整自动检查点策略 |
| MCP 服务器 | 配置 Model Context Protocol 连接 |
| Max Mode | 启用并行 best-of-N 推理 + judge 选择 |

---

## 与 OpenCode 的关系

MiMoCode 基于 [OpenCode](https://github.com/anomalyco/opencode) fork 而来，保留了其全部核心能力：

- 多模型提供商支持
- 终端 TUI 界面
- LSP（Language Server Protocol）集成
- MCP（Model Context Protocol）支持
- 插件系统

在此基础上新增了：持久记忆、智能上下文管理、子智能体编排、goal 驱动自主循环、compose 工作流、dream/distill 自我进化等能力。

---

## 对比 Claude Code

| 能力 | MiMoCode | Claude Code |
|------|----------|-------------|
| 跨会话记忆 | ✅ SQLite FTS5，自动管理 | ✅ `CLAUDE.md`，需手动维护 |
| 自动检查点 | ✅ 自动 | ❌ |
| 上下文重建 | ✅ | ❌ |
| 自我进化 | ✅ `/dream` `/distill` | ❌ |
| 树形任务系统 | ✅ | ✅ |
| 语音输入 | ✅ | ❌ |
| Goal 判断 | ✅ judge 模型 | ❌ |
| 开源 | ✅ MIT | ❌ |
| 免费通道 | ✅ 限时 | ❌ |
| 模型选择 | ✅ 任意 OpenAI 兼容 API | 仅 Anthropic |

---

## 总结

MiMoCode 解决了一个很实际的问题：**AI 编程助手的记忆断层**。

如果你受够了每次新会话都要重新向 AI 解释项目背景，或者希望 AI 助手能随着使用越来越懂你，MiMoCode 值得一试。特别是限时免费通道零配置就能体验，门槛很低。

**适合人群**：

- 喜欢终端工作流的开发者
- 维护中大型项目，需要 AI 长期理解项目上下文
- 希望 AI 助手能积累和复用工作经验
- 对开源工具有偏好，喜欢自己掌控

```bash
# 开始体验
curl -fsSL https://mimo.xiaomi.com/install | bash
```

---

## 参考链接

- [MiMoCode GitHub 仓库](https://github.com/XiaomiMiMo/MiMo-Code)
- [MiMoCode 官网](https://mimo.xiaomi.com/en/mimocode)
- [MiMoCode 博客：Long Horizon](https://mimo.xiaomi.com/en/blog/mimo-code-long-horizon)
- [OpenCode 原项目](https://github.com/anomalyco/opencode)
