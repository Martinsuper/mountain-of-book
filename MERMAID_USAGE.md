# Mermaid 图表功能使用指南

## 概述

本项目已集成 Mermaid 图表功能,支持在 Markdown 文章中使用 Mermaid 语法创建各种图表,并支持点击放大查看。

## 使用方法

在 Markdown 文件中使用 `mermaid` 代码块即可:

````markdown
```mermaid
graph TD
    A[开始] --> B[结束]
```
````

## 交互功能

### 点击放大

所有 mermaid 图表都支持点击放大功能：

- **点击图表**: 在模态框中放大显示图表
- **关闭方式**: 
  - 点击右上角关闭按钮
  - 点击模态框外的背景区域
  - 按 ESC 键
- **悬停提示**: 鼠标悬停在图表上时会有放大效果提示

## 支持的图表类型

### 1. 流程图 (Flowchart)

````markdown
```mermaid
graph TD
    A[开始] --> B[处理数据]
    B --> C{判断}
    C -->|是| D[输出结果]
    C -->|否| E[重新处理]
    E --> B
    D --> F[结束]
```
````

### 2. 序列图 (Sequence Diagram)

````markdown
```mermaid
sequenceDiagram
    participant 用户
    participant 系统
    用户->>系统: 发送请求
    系统-->>用户: 返回结果
```
````

### 3. 类图 (Class Diagram)

````markdown
```mermaid
classDiagram
    class Animal {
        +String name
        +void eat()
    }
    class Dog {
        +void bark()
    }
    Animal <|-- Dog
```
````

### 4. 状态图 (State Diagram)

````markdown
```mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中
    处理中 --> 已完成
    已完成 --> [*]
```
````

### 5. Gantt 图 (甘特图)

````markdown
```mermaid
gantt
    title 项目计划
    dateFormat YYYY-MM-DD
    section 开发
    需求分析 :a1, 2026-01-01, 7d
    编码开发 :a2, after a1, 14d
```
````

### 6. 思维导图 (Mindmap)

````markdown
```mermaid
mindmap
  root((中心主题))
    分支1
      子分支1
      子分支2
    分支2
```
````

### 7. 饼图 (Pie Chart)

````markdown
```mermaid
pie showData
    title 数据分布
    "类别A" : 40
    "类别B" : 60
```
````

## 特性

- **客户端渲染**: 使用 mermaid.js 在浏览器端实时渲染图表
- **主题支持**: 自动适配网站主题(亮色/暗色)
- **响应式**: 图表自动适配屏幕宽度
- **交互功能**: 支持点击、缩放等交互功能
- **点击放大**: 点击图表可以在模态框中放大查看
- **用户体验**: 
  - 悬停时图表有轻微放大效果提示可点击
  - 多种方式关闭模态框(按钮、背景、ESC键)
  - 主题切换后图表自动重新渲染

## 语法参考

更多 Mermaid 语法请参考官方文档: https://mermaid.js.org/introduction/

## 技术实现

- **remark plugin**: `src/lib/remark-mermaid.ts` - 处理 mermaid 代码块
- **客户端组件**: `src/components/Mermaid.astro` - 初始化和渲染图表
- **放大组件**: `src/components/MermaidModal.astro` - 点击放大功能
- **依赖**: mermaid npm 包