#!/usr/bin/env node
// scripts/fetch-plantuml.mjs
// 预获取所有 PlantUML SVG 到本地缓存目录
// 用法: pnpm fetch-plantuml

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import plantumlEncoder from 'plantuml-encoder';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.join(__dirname, '..', 'src', 'content', 'posts');
const cacheDir = path.join(__dirname, '..', '.plantuml-cache');

const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const TIMEOUT = 20000;

function ensureCacheDir() {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

function getCacheKey(code) {
  return createHash('md5').update(code).digest('hex');
}

function isCached(key) {
  return fs.existsSync(path.join(cacheDir, `${key}.svg`)) &&
         fs.existsSync(path.join(cacheDir, `${key}.meta`));
}

function getCached(key) {
  if (!isCached(key)) return null;
  try {
    const svg = fs.readFileSync(path.join(cacheDir, `${key}.svg`), 'utf-8');
    const meta = JSON.parse(fs.readFileSync(path.join(cacheDir, `${key}.meta`), 'utf-8'));
    return { svg, isError: meta.isError };
  } catch { return null; }
}

function setCache(key, svg, isError) {
  ensureCacheDir();
  fs.writeFileSync(path.join(cacheDir, `${key}.svg`), svg, 'utf-8');
  fs.writeFileSync(path.join(cacheDir, `${key}.meta`), JSON.stringify({ isError }), 'utf-8');
}

function extractPlantUmlBlocks(content, fileName) {
  const blocks = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '```plantuml') {
      const codeLines = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '```') {
        codeLines.push(lines[j]);
        j++;
      }
      if (j < lines.length) {
        blocks.push({ file: fileName, line: i + 1, code: codeLines.join('\n') });
      }
      i = j;
    }
  }
  return blocks;
}

/**
 * 检测 PlantUML SVG 是否为错误响应
 * 真正的错误 SVG 包含明显的错误文本，而不是正常图表中的颜色
 */
function isPlantUmlError(svg) {
  // 真正的错误 SVG 特征：包含明确的错误文本
  const errorPatterns = [
    /Syntax\s*Error/i,           // "Syntax Error?"
    /No diagram type/i,          // "No diagram type found"
    /Check the syntax/i,         // "Check the syntax"
    /ERROR:/i,                   // "ERROR: ..."
  ];

  return errorPatterns.some(p => p.test(svg));
}

/**
 * 使用 /txt 端点验证 PlantUML 语法
 * 返回 { valid: boolean, error?: string }
 */
async function validateSyntax(code) {
  try {
    const encoded = plantumlEncoder.encode(code);
    const url = `https://www.plantuml.com/plantuml/txt/${encoded}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` };
    }

    const text = await response.text();

    // PlantUML 错误响应通常以 "Error" 或 "Syntax Error" 开头
    // 而正常的 ASCII 艺术图表不会以这些词开头
    const trimmedText = text.trim();
    if (trimmedText.startsWith('Error') ||
        trimmedText.startsWith('Syntax Error') ||
        trimmedText.startsWith('No diagram type') ||
        trimmedText.startsWith('Unsupported') ||
        trimmedText.startsWith('Check the syntax')) {
      return { valid: false, error: trimmedText.substring(0, 200) };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

async function fetchSvg(code) {
  const encoded = plantumlEncoder.encode(code);
  const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT);
      const response = await fetch(url, {
        headers: { 'Accept': 'image/svg+xml' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const idx = next++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

async function main() {
  console.log('📦 预获取 PlantUML SVG...\n');
  ensureCacheDir();

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  const allBlocks = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    const blocks = extractPlantUmlBlocks(content, file);
    allBlocks.push(...blocks);
  }

  if (allBlocks.length === 0) {
    console.log('✅ 未找到 PlantUML 代码块');
    return;
  }

  const cached = allBlocks.filter(b => isCached(getCacheKey(b.code)));
  const needFetch = allBlocks.filter(b => !isCached(getCacheKey(b.code)));

  console.log(`找到 ${allBlocks.length} 个 PlantUML 代码块`);
  console.log(`缓存命中: ${cached.length}, 需要获取: ${needFetch.length}\n`);

  if (needFetch.length === 0) {
    console.log('✅ 所有图表已缓存');
    return;
  }

  console.log(`开始获取 ${needFetch.length} 个图表（并发 ${CONCURRENCY}）...\n`);

  let errors = 0;
  let success = 0;

  const tasks = needFetch.map(block => async () => {
    const key = getCacheKey(block.code);

    // 先验证语法
    const validation = await validateSyntax(block.code);
    if (!validation.valid) {
      errors++;
      console.log(`  ⚠️  ${block.file}:${block.line} - 语法错误: ${validation.error.substring(0, 80)}`);
      // 仍然获取 SVG（可能是错误图），用于降级显示
      try {
        const svg = await fetchSvg(block.code);
        setCache(key, svg, true);
      } catch {
        // 如果获取失败，创建一个占位 SVG
        const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="10" y="50" fill="red">Syntax Error: ${validation.error.substring(0, 100).replace(/</g, '&lt;')}</text></svg>`;
        setCache(key, errorSvg, true);
      }
      return;
    }

    // 语法正确，获取 SVG
    try {
      const svg = await fetchSvg(block.code);
      const isError = isPlantUmlError(svg);
      setCache(key, svg, isError);

      if (isError) {
        errors++;
        console.log(`  ⚠️  ${block.file}:${block.line} - 渲染错误`);
      } else {
        success++;
        console.log(`  ✅ ${block.file}:${block.line}`);
      }
    } catch (err) {
      errors++;
      console.log(`  ❌ ${block.file}:${block.line} - 获取失败: ${err.message}`);
    }
  });

  await runWithConcurrency(tasks, CONCURRENCY);

  console.log('\n' + '─'.repeat(50));
  console.log(`📊 完成: ${success} 成功, ${errors} 失败, 共 ${needFetch.length} 个新获取`);
  console.log(`💾 缓存目录: .plantuml-cache/`);

  if (errors > 0) {
    console.log('\n⚠️  部分图表获取失败或有语法错误');
    console.log('   构建时会 fallback 到远程 img 标签');
  }
}

main().catch(err => {
  console.error('脚本出错:', err);
  process.exit(1);
});
