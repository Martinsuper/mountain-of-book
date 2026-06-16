#!/usr/bin/env node
// scripts/inline-plantuml.mjs
// 构建后处理：将 PlantUML img 标签替换为内联 SVG（从缓存读取）
// 用法: pnpm build && pnpm inline-plantuml

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const cacheDir = path.join(__dirname, '..', '.plantuml-cache');

function getCacheKeyFromUrl(url) {
  // 从 URL 中提取编码后的 PlantUML 代码
  // URL 格式: https://www.plantuml.com/plantuml/svg/~1{encoded}
  const match = url.match(/plantuml\.com\/plantuml\/svg\/(~1)?(.+)/);
  if (!match) return null;
  // 返回编码部分（用于缓存查找）
  return match[2];
}

function findCacheKey(encoded) {
  // 缓存使用代码内容的 MD5 作为 key
  // 这里无法反向解码，所以遍历缓存目录匹配
  if (!fs.existsSync(cacheDir)) return null;

  // 遍历缓存文件，通过编码 URL 匹配
  // 实际上我们需要从 Markdown 源文件中提取代码
  // 简化方案：遍历所有缓存，检查编码后的 URL 是否匹配
  return null; // 这个方法不可行，需要改用其他策略
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isPlantUmlError(svg) {
  const errorPatterns = [
    /Syntax\s*Error/i,
    /No diagram type/i,
    /Check the syntax/i,
    /class="error"/,
    /fill="#?FF0000/i,
  ];
  return errorPatterns.some(p => p.test(svg));
}

function extractPlantUmlError(svg) {
  const texts = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(svg)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) texts.push(text);
  }
  return texts.length > 0 ? texts.join(' ') : 'PlantUML 渲染失败';
}

/**
 * 从 dist 中的 HTML 文件提取 PlantUML img URL，
 * 并从源 Markdown 文件中匹配代码，查找缓存
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let replacements = 0;

  // 匹配 PlantUML img 标签
  const imgRegex = /<img\s+src="(https:\/\/www\.plantuml\.com\/plantuml\/svg\/[^"]+)"[^>]*\/?>/g;

  content = content.replace(imgRegex, (match, url) => {
    // 从 URL 提取编码
    const encoded = url.split('/').pop();
    if (!encoded) return match;

    // 遍历缓存目录查找匹配的编码
    if (!fs.existsSync(cacheDir)) return match;

    const cacheFiles = fs.readdirSync(cacheDir).filter(f => f.endsWith('.svg'));
    for (const cacheFile of cacheFiles) {
      const key = cacheFile.replace('.svg', '');
      const metaFile = path.join(cacheDir, `${key}.meta`);

      // 读取缓存的 SVG，编码后比对 URL
      // 这个方法太慢，需要优化
    }

    return match; // 暂时不替换
  });

  fs.writeFileSync(filePath, content, 'utf-8');
  return replacements;
}

/**
 * 更好的方案：从源 Markdown 建立 URL -> 代码 的映射
 */
async function buildUrlToCodeMap() {
  const { encode } = await import('plantuml-encoder');
  const postsDir = path.join(__dirname, '..', 'src', 'content', 'posts');
  const map = new Map(); // encoded URL -> { code, cacheKey }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
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
          const code = codeLines.join('\n');
          const encoded = encode(code);
          const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
          const cacheKey = createHash('md5').update(code).digest('hex');
          map.set(encoded, { code, cacheKey });
        }
        i = j;
      }
    }
  }
  return map;
}

async function main() {
  console.log('🔧 内联 PlantUML SVG...\n');

  if (!fs.existsSync(cacheDir)) {
    console.log('⚠️  缓存目录不存在，请先运行 pnpm fetch-plantuml');
    return;
  }

  // 建立 URL -> 缓存 的映射
  console.log('📖 建立代码映射...');
  const urlMap = await buildUrlToCodeMap();
  console.log(`映射了 ${urlMap.size} 个 PlantUML 代码块\n`);

  // 查找所有 HTML 文件
  const htmlFiles = [];
  function findHtml(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) findHtml(fullPath);
      else if (entry.name.endsWith('.html')) htmlFiles.push(fullPath);
    }
  }
  findHtml(distDir);

  console.log(`找到 ${htmlFiles.length} 个 HTML 文件\n`);

  let totalInlined = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  for (const filePath of htmlFiles) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fileInlined = 0;
    let fileErrors = 0;

    const imgRegex = /<div class="plantuml-img not-prose"><img\s+src="https:\/\/www\.plantuml\.com\/plantuml\/svg\/(~1)?([^"]+)"[^>]*\/?><\/div>/g;

    content = content.replace(imgRegex, (match, prefix, encoded) => {
      const mapping = urlMap.get(encoded);
      if (!mapping) {
        totalSkipped++;
        return match;
      }

      const svgPath = path.join(cacheDir, `${mapping.cacheKey}.svg`);
      const metaPath = path.join(cacheDir, `${mapping.cacheKey}.meta`);

      if (!fs.existsSync(svgPath) || !fs.existsSync(metaPath)) {
        totalSkipped++;
        return match;
      }

      const svg = fs.readFileSync(svgPath, 'utf-8');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

      if (meta.isError) {
        const errorMsg = extractPlantUmlError(svg);
        fileErrors++;
        return `<div class="plantuml-error not-prose my-4 p-4 border-2 border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-950/20">
<p class="text-red-600 dark:text-red-400 text-sm font-medium mb-2">⚠ PlantUML 语法错误</p>
<pre class="text-sm overflow-x-auto"><code>${escapeHtml(mapping.code)}</code></pre>
<p class="text-red-500 dark:text-red-400 text-xs mt-2 opacity-80">${escapeHtml(errorMsg)}</p>
</div>`;
      }

      const styledSvg = svg.replace(/<svg /, '<svg style="max-width:100%;height:auto;" ');
      fileInlined++;
      return `<div class="plantuml-img not-prose">${styledSvg}</div>`;
    });

    if (fileInlined > 0 || fileErrors > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
      const relPath = path.relative(distDir, filePath);
      if (fileInlined > 0) console.log(`  ✅ ${relPath}: ${fileInlined} 个内联`);
      if (fileErrors > 0) console.log(`  ⚠️  ${relPath}: ${fileErrors} 个语法错误`);
    }

    totalInlined += fileInlined;
    totalErrors += fileErrors;
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`📊 完成: ${totalInlined} 个内联 SVG, ${totalErrors} 个错误降级, ${totalSkipped} 个跳过`);
}

main().catch(err => {
  console.error('脚本出错:', err);
  process.exit(1);
});
