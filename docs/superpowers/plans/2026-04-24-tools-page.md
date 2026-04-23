# 工具页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建开发者工具箱页面，包含JSON格式化、时间戳转换、文本对比、URL编码/解码、Base64编码/解码五个工具

**Architecture:** 单页面Tab切换布局，继承BaseLayout风格，所有工具逻辑使用内联JavaScript，遵循todo.astro的模式

**Tech Stack:** Astro 5.x, Tailwind CSS, 纯客户端JavaScript

---

## File Structure

| File | Purpose |
|------|---------|
| `src/pages/tools.astro` | 工具页面HTML结构、Tailwind样式、工具逻辑 |
| `src/layouts/BaseLayout.astro:101-111` | 导航栏添加工具链接 |

---

### Task 1: 创建工具页面基础结构

**Files:**
- Create: `src/pages/tools.astro`

- [ ] **Step 1: 创建页面文件骨架**

创建 `src/pages/tools.astro` 文件，包含基础HTML结构和BaseLayout继承：

```astro
---
// src/pages/tools.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="开发者工具" description="常用开发工具集合">
  <div class="tools-page">
    <!-- 页面标题 -->
    <header class="tools-header">
      <h1>🔧 开发者工具箱</h1>
      <p class="tools-subtitle">常用开发工具集合，助力高效开发</p>
    </header>

    <!-- Tab导航栏 -->
    <nav class="tools-tabs" id="toolsTabs">
      <button class="tab-btn active" data-tab="json">📋 JSON</button>
      <button class="tab-btn" data-tab="timestamp">🕐 时间戳</button>
      <button class="tab-btn" data-tab="diff">🔀 Diff</button>
      <button class="tab-btn" data-tab="url">🔗 URL</button>
      <button class="tab-btn" data-tab="base64">📦 Base64</button>
    </nav>

    <!-- 工具内容区容器 -->
    <div class="tools-content" id="toolsContent">
      <!-- 各工具内容将通过JS动态显示 -->
    </div>
  </div>
</BaseLayout>

<style is:inline>
  /* 基础页面样式 */
  .tools-page {
    padding: 1rem 0;
  }

  .tools-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .tools-header h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .tools-subtitle {
    color: #666;
    font-size: 0.9rem;
  }

  :global(.dark) .tools-subtitle {
    color: #aaa;
  }
</style>
```

- [ ] **Step 2: 启动开发服务器验证页面加载**

Run: `npm run dev`
Expected: 访问 http://localhost:4321/tools/ 能看到页面标题

- [ ] **Step 3: Commit基础结构**

```bash
git add src/pages/tools.astro
git commit -m "feat: 添加工具页面基础结构"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 2: 实现Tab导航栏样式和切换逻辑

**Files:**
- Modify: `src/pages/tools.astro`

- [ ] **Step 1: 添加Tab导航栏样式**

在 `<style is:inline>` 中添加Tab样式：

```css
/* Tab导航栏样式 */
.tools-tabs {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.5rem 1rem;
  border-radius: 25px;
  border: none;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

:global(.dark) .tab-btn {
  background: #374151;
  color: #d1d5db;
}

.tab-btn:hover {
  background: #e5e7eb;
}

:global(.dark) .tab-btn:hover {
  background: #4b5563;
}

.tab-btn.active {
  background: #3b82f6;
  color: #fff;
}

:global(.dark) .tab-btn.active {
  background: #2563eb;
}

/* 工具内容区 */
.tools-content {
  min-height: 400px;
}

.tool-panel {
  display: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tool-panel.active {
  display: block;
  opacity: 1;
}

/* 公共输入输出区样式 */
.tool-input,
.tool-output {
  width: 100%;
  min-height: 150px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.9rem;
  resize: vertical;
  background: #fff;
}

:global(.dark) .tool-input,
:global(.dark) .tool-output {
  background: #1f2937;
  border-color: #4b5563;
  color: #f3f4f6;
}

.tool-input:focus,
.tool-output:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 操作按钮样式 */
.tool-actions {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

.tool-btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.tool-btn-primary {
  background: #3b82f6;
  color: #fff;
}

.tool-btn-primary:hover {
  background: #2563eb;
}

.tool-btn-success {
  background: #10b981;
  color: #fff;
}

.tool-btn-success:hover {
  background: #059669;
}

.tool-btn-warning {
  background: #f59e0b;
  color: #fff;
}

.tool-btn-warning:hover {
  background: #d97706;
}

.tool-btn-danger {
  background: #ef4444;
  color: #fff;
}

.tool-btn-danger:hover {
  background: #dc2626;
}

.tool-btn-secondary {
  background: #f3f4f6;
  color: #4b5563;
}

:global(.dark) .tool-btn-secondary {
  background: #374151;
  color: #d1d5db;
}

.tool-btn-secondary:hover {
  background: #e5e7eb;
}

:global(.dark) .tool-btn-secondary:hover {
  background: #4b5563;
}
```

- [ ] **Step 2: 添加Tab切换JavaScript逻辑**

在页面末尾添加 `<script>` 块：

```astro
<script>
// Tab切换逻辑
const tabsContainer = document.getElementById('toolsTabs');
const contentContainer = document.getElementById('toolsContent');
const tabBtns = document.querySelectorAll('.tab-btn');

// 工具面板HTML模板
const toolPanels = {
  json: `
    <div class="tool-panel" id="panel-json">
      <div class="tool-section">
        <label class="tool-label">输入JSON</label>
        <textarea class="tool-input" id="jsonInput" placeholder="请输入JSON字符串..." rows="8"></textarea>
        <div class="json-status" id="jsonStatus"></div>
      </div>
      <div class="tool-actions">
        <button class="tool-btn tool-btn-primary" id="jsonFormat">格式化</button>
        <button class="tool-btn tool-btn-success" id="jsonMinify">压缩</button>
        <button class="tool-btn tool-btn-warning" id="jsonValidate">校验</button>
        <button class="tool-btn tool-btn-secondary" id="jsonClear">清空</button>
      </div>
      <div class="tool-section">
        <label class="tool-label">输出结果</label>
        <textarea class="tool-output" id="jsonOutput" placeholder="输出结果..." rows="8" readonly></textarea>
      </div>
      <div class="tool-actions">
        <button class="tool-btn tool-btn-secondary" id="jsonCopy">📋 复制结果</button>
      </div>
    </div>
  `,
  timestamp: `
    <div class="tool-panel" id="panel-timestamp">
      <div class="tool-section">
        <label class="tool-label">时间戳转换</label>
        <div class="timestamp-input-row">
          <input type="text" class="timestamp-input" id="timestampInput" placeholder="请输入时间戳..." />
          <div class="unit-toggle">
            <button class="unit-btn active" data-unit="auto">自动</button>
            <button class="unit-btn" data-unit="ms">毫秒</button>
            <button class="unit-btn" data-unit="s">秒</button>
          </div>
        </div>
      </div>
      <div class="timestamp-results" id="timestampResults">
        <div class="result-item">
          <span class="result-label">本地时间</span>
          <span class="result-value" id="resultLocal">-</span>
        </div>
        <div class="result-item">
          <span class="result-label">UTC时间</span>
          <span class="result-value" id="resultUtc">-</span>
        </div>
        <div class="result-item">
          <span class="result-label">相对时间</span>
          <span class="result-value" id="resultRelative">-</span>
        </div>
        <div class="result-item">
          <span class="result-label">ISO 8601</span>
          <span class="result-value" id="resultIso">-</span>
        </div>
      </div>
      <div class="tool-section">
        <label class="tool-label">日期转时间戳</label>
        <input type="datetime-local" class="datetime-input" id="datetimeInput" />
        <div class="datetime-results" id="datetimeResults">
          <span class="ts-value" id="tsMs">-</span>
          <span class="ts-value" id="tsS">-</span>
        </div>
      </div>
      <div class="tool-actions">
        <button class="tool-btn tool-btn-primary" id="tsNow">当前时间戳</button>
        <button class="tool-btn tool-btn-secondary" id="tsTodayZero">今天0点</button>
        <button class="tool-btn tool-btn-secondary" id="tsWeekMonday">本周一</button>
      </div>
    </div>
  `,
  diff: `
    <div class="tool-panel" id="panel-diff">
      <div class="diff-inputs">
        <div class="diff-input-col">
          <label class="tool-label">原文</label>
          <textarea class="tool-input" id="diffOriginal" placeholder="请输入原文..." rows="10"></textarea>
        </div>
        <div class="diff-input-col">
          <label class="tool-label">新文</label>
          <textarea class="tool-input" id="diffNew" placeholder="请输入新文..." rows="10"></textarea>
        </div>
      </div>
      <div class="tool-actions">
        <button class="tool-btn tool-btn-primary" id="diffCompare">开始对比</button>
        <button class="tool-btn tool-btn-secondary" id="diffClear">清空全部</button>
      </div>
      <div class="diff-stats" id="diffStats"></div>
      <div class="diff-results" id="diffResults">
        <div class="diff-result-col" id="diffResultLeft"></div>
        <div class="diff-result-col" id="diffResultRight"></div>
      </div>
    </div>
  `,
  url: `
    <div class="tool-panel" id="panel-url">
      <div class="tool-section">
        <label class="tool-label">输入</label>
        <textarea class="tool-input" id="urlInput" placeholder="请输入URL或字符串..." rows="6"></textarea>
      </div>
      <div class="tool-actions">
        <button class="tool-btn tool-btn-primary" id="urlEncode">编码</button>
        <button class="tool-btn tool-btn-success" id="urlDecode">解码</button>
        <button class="tool-btn tool-btn-secondary" id="urlClear">清空</button>
      </div>
      <div class="tool-section">
        <label class="tool-label">输出结果</label>
        <textarea class="tool-output" id="urlOutput" placeholder="输出结果..." rows="6" readonly></textarea>
      </div>
      <div class="tool-actions">
        <button class="tool-btn tool-btn-secondary" id="urlCopy">📋 复制结果</button>
      </div>
    </div>
  `,
  base64: `
    <div class="tool-panel" id="panel-base64">
      <div class="tool-section">
        <label class="tool-label">输入</label>
        <textarea class="tool-input" id="base64Input" placeholder="请输入文本或Base64字符串..." rows="6"></textarea>
        <div class="file-upload-hint">支持拖拽文件上传或 <input type="file" id="base64File" class="file-input" /></div>
      </div>
      <div class="tool-actions">
        <button class="tool-btn tool-btn-primary" id="base64Encode">编码</button>
        <button class="tool-btn tool-btn-success" id="base64Decode">解码</button>
        <button class="tool-btn tool-btn-secondary" id="base64Clear">清空</button>
      </div>
      <div class="tool-section">
        <label class="tool-label">输出结果</label>
        <textarea class="tool-output" id="base64Output" placeholder="输出结果..." rows="6" readonly></textarea>
      </div>
      <div class="tool-actions">
        <button class="tool-btn tool-btn-secondary" id="base64Copy">📋 复制结果</button>
        <button class="tool-btn tool-btn-secondary" id="base64Download" style="display:none">下载文件</button>
      </div>
    </div>
  `
};

// 当前激活的Tab
let currentTab = 'json';

// 初始化Tab内容
function initTabs() {
  // 渲染所有工具面板
  Object.keys(toolPanels).forEach(key => {
    contentContainer!.insertAdjacentHTML('beforeend', toolPanels[key]);
  });

  // 根据URL hash设置初始Tab
  const hash = window.location.hash.slice(1);
  if (hash && toolPanels[hash]) {
    currentTab = hash;
  }

  // 设置初始激活状态
  updateTabState(currentTab);

  // 绑定Tab点击事件
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab && tab !== currentTab) {
        currentTab = tab;
        updateTabState(tab);
        window.location.hash = tab;
      }
    });
  });

  // 键盘导航
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const tabs = Object.keys(toolPanels);
      const currentIndex = tabs.indexOf(currentTab);
      let newIndex = currentIndex;

      if (e.key === 'ArrowLeft') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      } else {
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      }

      currentTab = tabs[newIndex];
      updateTabState(currentTab);
      window.location.hash = currentTab;
    }
  });
}

// 更新Tab状态
function updateTabState(tab: string) {
  // 更新按钮状态
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });

  // 更新面板状态
  document.querySelectorAll('.tool-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tab}`);
  });
}

// 初始化
initTabs();
</script>
```

- [ ] **Step 3: 添加Tab面板相关样式**

继续在 `<style is:inline>` 中添加：

```css
/* 工具区块样式 */
.tool-section {
  margin-bottom: 1rem;
}

.tool-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #4b5563;
}

:global(.dark) .tool-label {
  color: #9ca3af;
}

/* 时间戳工具样式 */
.timestamp-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.timestamp-input {
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
}

:global(.dark) .timestamp-input {
  background: #1f2937;
  border-color: #4b5563;
  color: #f3f4f6;
}

.unit-toggle {
  display: flex;
  gap: 0.25rem;
}

.unit-btn {
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.75rem;
  cursor: pointer;
}

:global(.dark) .unit-btn {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

.unit-btn.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.timestamp-results {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
}

:global(.dark) .timestamp-results {
  background: rgba(255, 255, 255, 0.05);
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.result-label {
  font-size: 0.75rem;
  color: #888;
}

.result-value {
  font-size: 0.9rem;
  font-weight: 500;
}

.datetime-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

:global(.dark) .datetime-input {
  background: #1f2937;
  border-color: #4b5563;
  color: #f3f4f6;
}

.datetime-results {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.ts-value {
  padding: 0.5rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  font-family: monospace;
}

/* Diff工具样式 */
.diff-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.diff-input-col {
  display: flex;
  flex-direction: column;
}

.diff-stats {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
  justify-content: center;
}

.diff-stats-item {
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

.diff-stats-add {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.diff-stats-del {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.diff-results {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.diff-result-col {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: #fff;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  overflow-y: auto;
}

:global(.dark) .diff-result-col {
  background: #1f2937;
  border-color: #4b5563;
}

.diff-line {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin: 0.25rem 0;
}

.diff-line-add {
  background: rgba(16, 185, 129, 0.15);
}

.diff-line-del {
  background: rgba(239, 68, 68, 0.15);
}

.diff-line-num {
  display: inline-block;
  width: 40px;
  color: #888;
  text-align: right;
  margin-right: 0.5rem;
}

/* Base64文件上传样式 */
.file-upload-hint {
  font-size: 0.75rem;
  color: #888;
  margin-top: 0.5rem;
}

.file-input {
  display: inline;
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .diff-inputs,
  .diff-results {
    grid-template-columns: 1fr;
  }

  .timestamp-results {
    grid-template-columns: 1fr;
  }
}

/* JSON状态样式 */
.json-status {
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.json-valid {
  color: #10b981;
}

.json-invalid {
  color: #ef4444;
}
```

- [ ] **Step 4: 验证Tab切换功能**

Run: 访问 http://localhost:4321/tools/
Expected: Tab切换正常，URL hash同步更新，键盘左右键切换正常

- [ ] **Step 5: Commit Tab导航功能**

```bash
git add src/pages/tools.astro
git commit -m "feat: 实现工具页面Tab导航切换功能"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 3: 实现JSON格式化/压缩/校验工具

**Files:**
- Modify: `src/pages/tools.astro`

- [ ] **Step 1: 在script块中添加JSON工具逻辑**

在 `initTabs()` 调用之后添加JSON工具逻辑：

```javascript
// JSON工具逻辑
const jsonInput = document.getElementById('jsonInput') as HTMLTextAreaElement;
const jsonOutput = document.getElementById('jsonOutput') as HTMLTextAreaElement;
const jsonStatus = document.getElementById('jsonStatus');
const jsonFormatBtn = document.getElementById('jsonFormat');
const jsonMinifyBtn = document.getElementById('jsonMinify');
const jsonValidateBtn = document.getElementById('jsonValidate');
const jsonClearBtn = document.getElementById('jsonClear');
const jsonCopyBtn = document.getElementById('jsonCopy');

// 实时校验
jsonInput?.addEventListener('input', () => {
  const input = jsonInput.value.trim();
  if (!input) {
    jsonStatus!.textContent = '';
    jsonStatus!.className = 'json-status';
    return;
  }

  try {
    JSON.parse(input);
    jsonStatus!.textContent = '✓ JSON格式有效';
    jsonStatus!.className = 'json-status json-valid';
  } catch (e) {
    const error = e as SyntaxError;
    jsonStatus!.textContent = `✗ ${error.message}`;
    jsonStatus!.className = 'json-status json-invalid';
  }
});

// 格式化
jsonFormatBtn?.addEventListener('click', () => {
  const input = jsonInput.value.trim();
  if (!input) return;

  try {
    const parsed = JSON.parse(input);
    jsonOutput.value = JSON.stringify(parsed, null, 2);
    showToast('格式化成功');
  } catch (e) {
    const error = e as SyntaxError;
    jsonOutput.value = `错误: ${error.message}`;
    showToast('JSON格式无效', 'error');
  }
});

// 压缩
jsonMinifyBtn?.addEventListener('click', () => {
  const input = jsonInput.value.trim();
  if (!input) return;

  try {
    const parsed = JSON.parse(input);
    jsonOutput.value = JSON.stringify(parsed);
    showToast('压缩成功');
  } catch (e) {
    const error = e as SyntaxError;
    jsonOutput.value = `错误: ${error.message}`;
    showToast('JSON格式无效', 'error');
  }
});

// 校验
jsonValidateBtn?.addEventListener('click', () => {
  const input = jsonInput.value.trim();
  if (!input) {
    showToast('请输入JSON', 'error');
    return;
  }

  try {
    JSON.parse(input);
    jsonOutput.value = '✓ JSON格式有效';
    showToast('校验通过');
  } catch (e) {
    const error = e as SyntaxError;
    jsonOutput.value = `✗ JSON格式错误:\n${error.message}`;
    showToast('校验失败', 'error');
  }
});

// 清空
jsonClearBtn?.addEventListener('click', () => {
  jsonInput.value = '';
  jsonOutput.value = '';
  jsonStatus!.textContent = '';
  jsonStatus!.className = 'json-status';
});

// 复制
jsonCopyBtn?.addEventListener('click', () => {
  copyToClipboard(jsonOutput.value);
});
```

- [ ] **Step 2: 添加Toast提示和复制功能**

在script块顶部添加公共函数：

```javascript
// Toast提示
function showToast(message: string, type: 'success' | 'error' = 'success') {
  // 移除已有的toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? '#ef4444' : '#1f2937'};
    color: #fff;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    animation: fadeInUp 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOutDown 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// 复制到剪贴板
async function copyToClipboard(text: string) {
  if (!text) {
    showToast('无内容可复制', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板');
  } catch {
    showToast('复制失败', 'error');
  }
}
```

- [ ] **Step 3: 添加Toast动画样式**

在 `<style is:inline>` 中添加：

```css
/* Toast样式 */
@keyframes fadeInUp {
  from {
    transform: translateX(-50%) translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

@keyframes fadeOutDown {
  from {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
  to {
    transform: translateX(-50%) translateY(20px);
    opacity: 0;
  }
}
```

- [ ] **Step 4: 测试JSON工具功能**

Run: 在浏览器中测试JSON工具
Expected:
- 输入无效JSON显示红色错误状态
- 输入有效JSON显示绿色✓
- 格式化按钮生成美化JSON
- 压缩按钮生成紧凑JSON
- 复制按钮成功复制到剪贴板

- [ ] **Step 5: Commit JSON工具**

```bash
git add src/pages/tools.astro
git commit -m "feat: 实现JSON格式化/压缩/校验工具"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 4: 实现时间戳转换工具

**Files:**
- Modify: `src/pages/tools.astro`

- [ ] **Step 1: 添加时间戳转换逻辑**

在script块中添加时间戳工具代码：

```javascript
// 时间戳工具逻辑
const timestampInput = document.getElementById('timestampInput') as HTMLInputElement;
const unitBtns = document.querySelectorAll('.unit-btn');
const resultLocal = document.getElementById('resultLocal');
const resultUtc = document.getElementById('resultUtc');
const resultRelative = document.getElementById('resultRelative');
const resultIso = document.getElementById('resultIso');
const datetimeInput = document.getElementById('datetimeInput') as HTMLInputElement;
const tsMs = document.getElementById('tsMs');
const tsS = document.getElementById('tsS');
const tsNowBtn = document.getElementById('tsNow');
const tsTodayZeroBtn = document.getElementById('tsTodayZero');
const tsWeekMondayBtn = document.getElementById('tsWeekMonday');

let currentUnit: 'auto' | 'ms' | 's' = 'auto';
let debounceTimer: number | null = null;

// 单位切换
unitBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentUnit = btn.getAttribute('data-unit') as 'auto' | 'ms' | 's';
    unitBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    convertTimestamp();
  });
});

// 时间戳转换（实时）
timestampInput?.addEventListener('input', () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(convertTimestamp, 200);
});

function convertTimestamp() {
  const input = timestampInput.value.trim();
  if (!input || !/^\d+$/.test(input)) {
    resultLocal!.textContent = '-';
    resultUtc!.textContent = '-';
    resultRelative!.textContent = '-';
    resultIso!.textContent = '-';
    return;
  }

  let ts = parseInt(input, 10);

  // 自动判断单位
  if (currentUnit === 'auto') {
    if (input.length === 13) {
      ts = ts; // 毫秒
    } else if (input.length === 10) {
      ts = ts * 1000; // 秒转毫秒
    }
  } else if (currentUnit === 's') {
    ts = ts * 1000;
  }

  const date = new Date(ts);

  // 本地时间
  resultLocal!.textContent = formatLocalTime(date);

  // UTC时间
  resultUtc!.textContent = date.toISOString();

  // 相对时间
  resultRelative!.textContent = formatRelativeTime(ts);

  // ISO 8601
  const offset = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetStr = `${offset >= 0 ? '+' : '-'}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
  resultIso!.textContent = date.toISOString().replace('Z', offsetStr);
}

function formatLocalTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const absDiff = Math.abs(diff);

  if (absDiff < 60 * 1000) return '刚刚';
  if (absDiff < 60 * 60 * 1000) return `${Math.floor(absDiff / (60 * 1000))}分钟${diff > 0 ? '前' : '后'}`;
  if (absDiff < 24 * 60 * 60 * 1000) return `${Math.floor(absDiff / (60 * 60 * 1000))}小时${diff > 0 ? '前' : '后'}`;
  if (absDiff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(absDiff / (24 * 60 * 60 * 1000))}天${diff > 0 ? '前' : '后'}`;
  if (absDiff < 30 * 24 * 60 * 60 * 1000) return `${Math.floor(absDiff / (7 * 24 * 60 * 60 * 1000))}周${diff > 0 ? '前' : '后'}`;
  if (absDiff < 365 * 24 * 60 * 60 * 1000) return `${Math.floor(absDiff / (30 * 24 * 60 * 60 * 1000))}月${diff > 0 ? '前' : '后'}`;
  return `${Math.floor(absDiff / (365 * 24 * 60 * 60 * 1000))}年${diff > 0 ? '前' : '后'}`;
}

// 日期转时间戳
datetimeInput?.addEventListener('input', () => {
  const value = datetimeInput.value;
  if (!value) {
    tsMs!.textContent = '-';
    tsS!.textContent = '-';
    return;
  }

  const date = new Date(value);
  const ms = date.getTime();
  const s = Math.floor(ms / 1000);

  tsMs!.textContent = `${ms} ms`;
  tsS!.textContent = `${s} s`;
});

// 当前时间戳
tsNowBtn?.addEventListener('click', () => {
  timestampInput.value = String(Date.now());
  convertTimestamp();
  showToast('已填入当前时间戳');
});

// 今天0点
tsTodayZeroBtn?.addEventListener('click', () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  timestampInput.value = String(now.getTime());
  convertTimestamp();
  showToast('已填入今天0点时间戳');
});

// 本周一
tsWeekMondayBtn?.addEventListener('click', () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  now.setDate(diff);
  now.setHours(0, 0, 0, 0);
  timestampInput.value = String(now.getTime());
  convertTimestamp();
  showToast('已填入本周一时间戳');
});
```

- [ ] **Step 2: 测试时间戳工具**

Run: 在浏览器中测试时间戳工具
Expected:
- 输入时间戳实时显示转换结果
- 单位切换正常
- 相对时间显示正确
- 日期选择器反向转换正常
- 快捷按钮生成正确时间戳

- [ ] **Step 3: Commit时间戳工具**

```bash
git add src/pages/tools.astro
git commit -m "feat: 实现时间戳转换工具"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 5: 实现文本对比(Diff)工具

**Files:**
- Modify: `src/pages/tools.astro`

- [ ] **Step 1: 添加Diff工具逻辑**

在script块中添加：

```javascript
// Diff工具逻辑
const diffOriginal = document.getElementById('diffOriginal') as HTMLTextAreaElement;
const diffNew = document.getElementById('diffNew') as HTMLTextAreaElement;
const diffCompareBtn = document.getElementById('diffCompare');
const diffClearBtn = document.getElementById('diffClear');
const diffStats = document.getElementById('diffStats');
const diffResultLeft = document.getElementById('diffResultLeft');
const diffResultRight = document.getElementById('diffResultRight');

diffCompareBtn?.addEventListener('click', () => {
  const original = diffOriginal.value;
  const newText = diffNew.value;

  if (!original && !newText) {
    showToast('请输入文本', 'error');
    return;
  }

  const originalLines = original.split('\n');
  const newLines = newText.split('\n');

  // 简单行级对比算法
  const result = compareLines(originalLines, newLines);

  // 显示统计
  diffStats!.innerHTML = `
    <span class="diff-stats-item diff-stats-add">+${result.addCount} 新增</span>
    <span class="diff-stats-item diff-stats-del">-${result.delCount} 删除</span>
  `;

  // 显示左侧原文
  diffResultLeft!.innerHTML = renderDiffLines(result.leftLines, 'left');

  // 显示右侧新文
  diffResultRight!.innerHTML = renderDiffLines(result.rightLines, 'right');

  showToast('对比完成');

  // 设置同步滚动
  setupSyncScroll();
});

diffClearBtn?.addEventListener('click', () => {
  diffOriginal.value = '';
  diffNew.value = '';
  diffStats!.innerHTML = '';
  diffResultLeft!.innerHTML = '';
  diffResultRight!.innerHTML = '';
});

function compareLines(original: string[], newLines: string[]) {
  const leftLines: Array<{ text: string; type: 'normal' | 'del' }> = [];
  const rightLines: Array<{ text: string; type: 'normal' | 'add' }> = [];

  let addCount = 0;
  let delCount = 0;

  // 使用最长公共子序列思路简化实现
  const lcs = findLCS(original, newLines);

  let origIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (origIdx < original.length || newIdx < newLines.length) {
    // 处理左侧原文
    if (origIdx < original.length) {
      if (lcsIdx < lcs.length && original[origIdx] === lcs[lcsIdx]) {
        leftLines.push({ text: original[origIdx], type: 'normal' });
        origIdx++;
        lcsIdx++;
      } else {
        leftLines.push({ text: original[origIdx], type: 'del' });
        delCount++;
        origIdx++;
      }
    }

    // 处理右侧新文
    if (newIdx < newLines.length) {
      if (lcsIdx < lcs.length && newLines[newIdx] === lcs[lcsIdx]) {
        rightLines.push({ text: newLines[newIdx], type: 'normal' });
        newIdx++;
      } else {
        rightLines.push({ text: newLines[newIdx], type: 'add' });
        addCount++;
        newIdx++;
      }
    }
  }

  return { leftLines, rightLines, addCount, delCount };
}

// 最长公共子序列
function findLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯找出LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

function renderDiffLines(lines: Array<{ text: string; type: string }>, side: 'left' | 'right'): string {
  return lines.map((line, idx) => {
    const typeClass = line.type === 'del' ? 'diff-line-del' : line.type === 'add' ? 'diff-line-add' : '';
    const prefix = line.type === 'del' ? '- ' : line.type === 'add' ? '+ ' : '  ';
    return `<div class="diff-line ${typeClass}"><span class="diff-line-num">${idx + 1}</span>${prefix}${escapeHtml(line.text)}</div>`;
  }).join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setupSyncScroll() {
  const left = diffResultLeft;
  const right = diffResultRight;

  if (!left || !right) return;

  left.addEventListener('scroll', () => {
    right.scrollTop = left.scrollTop;
  });

  right.addEventListener('scroll', () => {
    left.scrollTop = right.scrollTop;
  });
}
```

- [ ] **Step 2: 测试Diff工具**

Run: 在浏览器中测试Diff工具
Expected:
- 输入原文和新文后点击对比
- 左右分栏显示对比结果
- 删除行红色背景，新增行绿色背景
- 统计显示正确的新增/删除行数
- 左右同步滚动正常

- [ ] **Step 3: Commit Diff工具**

```bash
git add src/pages/tools.astro
git commit -m "feat: 实现文本对比(Diff)工具"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 6: 实现URL编码/解码工具

**Files:**
- Modify: `src/pages/tools.astro`

- [ ] **Step 1: 添加URL工具逻辑**

在script块中添加：

```javascript
// URL工具逻辑
const urlInput = document.getElementById('urlInput') as HTMLTextAreaElement;
const urlOutput = document.getElementById('urlOutput') as HTMLTextAreaElement;
const urlEncodeBtn = document.getElementById('urlEncode');
const urlDecodeBtn = document.getElementById('urlDecode');
const urlClearBtn = document.getElementById('urlClear');
const urlCopyBtn = document.getElementById('urlCopy');

urlEncodeBtn?.addEventListener('click', () => {
  const input = urlInput.value;
  if (!input) {
    showToast('请输入内容', 'error');
    return;
  }

  try {
    urlOutput.value = encodeURIComponent(input);
    showToast('编码成功');
  } catch (e) {
    urlOutput.value = `错误: ${(e as Error).message}`;
    showToast('编码失败', 'error');
  }
});

urlDecodeBtn?.addEventListener('click', () => {
  const input = urlInput.value;
  if (!input) {
    showToast('请输入内容', 'error');
    return;
  }

  try {
    urlOutput.value = decodeURIComponent(input);
    showToast('解码成功');
  } catch (e) {
    urlOutput.value = `错误: ${(e as Error).message}\n提示: 输入可能不是有效的URL编码字符串`;
    showToast('解码失败', 'error');
  }
});

urlClearBtn?.addEventListener('click', () => {
  urlInput.value = '';
  urlOutput.value = '';
});

urlCopyBtn?.addEventListener('click', () => {
  copyToClipboard(urlOutput.value);
});
```

- [ ] **Step 2: 测试URL工具**

Run: 在浏览器中测试URL工具
Expected:
- 编码按钮正确编码URL
- 解码按钮正确解码URL编码字符串
- 错误处理显示友好提示
- 复制功能正常

- [ ] **Step 3: Commit URL工具**

```bash
git add src/pages/tools.astro
git commit -m "feat: 实现URL编码/解码工具"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 7: 实现Base64编码/解码工具

**Files:**
- Modify: `src/pages/tools.astro`

- [ ] **Step 1: 添加Base64工具逻辑**

在script块中添加：

```javascript
// Base64工具逻辑
const base64Input = document.getElementById('base64Input') as HTMLTextAreaElement;
const base64Output = document.getElementById('base64Output') as HTMLTextAreaElement;
const base64FileInput = document.getElementById('base64File') as HTMLInputElement;
const base64EncodeBtn = document.getElementById('base64Encode');
const base64DecodeBtn = document.getElementById('base64Decode');
const base64ClearBtn = document.getElementById('base64Clear');
const base64CopyBtn = document.getElementById('base64Copy');
const base64DownloadBtn = document.getElementById('base64Download');

let decodedBlob: Blob | null = null;

// Base64编码（支持UTF-8）
base64EncodeBtn?.addEventListener('click', () => {
  const input = base64Input.value;
  if (!input) {
    showToast('请输入内容', 'error');
    return;
  }

  try {
    // 使用TextEncoder处理UTF-8
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);
    const base64 = btoa(String.fromCharCode(...bytes));
    base64Output.value = base64;
    showToast('编码成功');
    decodedBlob = null;
    base64DownloadBtn!.style.display = 'none';
  } catch (e) {
    base64Output.value = `错误: ${(e as Error).message}`;
    showToast('编码失败', 'error');
  }
});

// Base64解码（支持UTF-8）
base64DecodeBtn?.addEventListener('click', () => {
  const input = base64Input.value.trim();
  if (!input) {
    showToast('请输入内容', 'error');
    return;
  }

  try {
    const binaryStr = atob(input);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // 尝试解码为UTF-8文本
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(bytes);
    base64Output.value = text;

    // 存储解码后的Blob供下载
    decodedBlob = new Blob([bytes], { type: 'application/octet-stream' });
    base64DownloadBtn!.style.display = 'inline-block';

    showToast('解码成功');
  } catch (e) {
    base64Output.value = `错误: ${(e as Error).message}\n提示: 输入可能不是有效的Base64字符串`;
    showToast('解码失败', 'error');
    decodedBlob = null;
    base64DownloadBtn!.style.display = 'none';
  }
});

// 文件上传编码
base64FileInput?.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size > 1024 * 1024) {
    showToast('文件过大（超过1MB），可能影响性能', 'error');
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as string;
    // 移除data:xxx;base64,前缀
    const base64 = result.split(',')[1];
    base64Input.value = `文件: ${file.name} (${formatFileSize(file.size)})\n${base64}`;
    showToast('文件已加载');
  };
  reader.readAsDataURL(file);
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

base64ClearBtn?.addEventListener('click', () => {
  base64Input.value = '';
  base64Output.value = '';
  decodedBlob = null;
  base64DownloadBtn!.style.display = 'none';
});

base64CopyBtn?.addEventListener('click', () => {
  copyToClipboard(base64Output.value);
});

base64DownloadBtn?.addEventListener('click', () => {
  if (!decodedBlob) return;

  const url = URL.createObjectURL(decodedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'decoded_file';
  a.click();
  URL.revokeObjectURL(url);
  showToast('文件已下载');
});
```

- [ ] **Step 2: 测试Base64工具**

Run: 在浏览器中测试Base64工具
Expected:
- 编码按钮正确编码文本（包括中文）
- 解码按钮正确解码Base64字符串
- 文件上传后显示文件名和Base64内容
- 解码后显示下载按钮
- 复制和下载功能正常

- [ ] **Step 3: Commit Base64工具**

```bash
git add src/pages/tools.astro
git commit -m "feat: 实现Base64编码/解码工具"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 8: 添加导航栏链接

**Files:**
- Modify: `src/layouts/BaseLayout.astro:101-111`

- [ ] **Step 1: 在导航栏添加工具链接**

在 `src/layouts/BaseLayout.astro` 的导航栏中，在"待办"链接之后添加工具链接：

找到第101-111行附近的导航链接区域，在"待办"之后、"标签"之前添加：

```astro
<a
  href="/tools/"
  class={`px-4 py-2 rounded-full transition-all duration-200 no-underline ${currentPath === '/tools/' ? 'bg-blue-600 dark:bg-blue-500 text-white font-medium' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
>
  工具
</a>
```

- [ ] **Step 2: 验证导航链接**

Run: `npm run dev`
Expected: 访问 http://localhost:4321/ 导航栏显示"工具"链接，点击跳转到工具页面，选中状态正确

- [ ] **Step 3: Commit导航链接**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: 在导航栏添加工具页面链接"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 9: 添加深色模式完善和响应式优化

**Files:**
- Modify: `src/pages/tools.astro`

- [ ] **Step 1: 检查深色模式样式**

确保所有工具的深色模式样式已正确配置：
- Tab按钮深色样式
- 输入/输出区深色样式
- 工具按钮深色样式
- Diff结果深色样式
- 时间戳结果深色样式

已在前面步骤中完成，检查确认无需额外修改。

- [ ] **Step 2: 测试深色模式**

Run: 点击右上角主题切换按钮
Expected: 工具页面所有元素正确切换到深色模式

- [ ] **Step 3: 测试移动端响应式**

Run: 打开浏览器开发者工具，切换到移动端视图
Expected:
- Tab按钮flex-wrap正常
- 输入/输出区上下堆叠
- Diff工具输入区和结果区上下堆叠
- 时间戳结果区单列显示

- [ ] **Step 4: Commit样式优化确认**

```bash
git status
# 如有修改则提交
git add src/pages/tools.astro
git commit -m "style: 完善工具页面深色模式和响应式样式"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 10: 最终测试和构建验证

**Files:**
- None (测试阶段)

- [ ] **Step 1: 运行完整功能测试**

Run: `npm run dev`
Expected: 所有5个工具功能正常工作

- [ ] **Step 2: 运行构建命令**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 3: 预览构建结果**

Run: `npm run preview`
Expected: 预览站点正常，工具页面可访问

- [ ] **Step 4: Commit最终状态（如有未提交修改）**

```bash
git status
git add -A
git commit -m "feat: 工具页面完成"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Self-Review

**1. Spec覆盖检查：**
- ✓ JSON格式化/压缩/校验 - Task 3
- ✓ 时间戳转换（时间戳↔日期）- Task 4
- ✓ 文本对比 - Task 5
- ✓ URL编码/解码 - Task 6
- ✓ Base64编码/解码 - Task 7
- ✓ Tab导航栏 - Task 2
- ✓ 页面基础结构 - Task 1
- ✓ 导航栏链接 - Task 8
- ✓ 深色模式 - Task 9
- ✓ 响应式设计 - Task 9
- ✓ Toast提示 - Task 3
- ✓ 复制功能 - Task 3

**2. Placeholder扫描：**
- 无TBD/TODO占位符
- 所有代码块包含完整实现
- 无"类似Task X"的引用

**3. 类型一致性：**
- JavaScript变量命名一致
- 函数签名明确
- DOM元素ID命名统一（如jsonInput、jsonOutput等）

---

## 计划完成

计划已保存到 `docs/superpowers/plans/2026-04-24-tools-page.md`。