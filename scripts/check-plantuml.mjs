#!/usr/bin/env node
/**
 * check-plantuml.mjs
 * 扫描所有文章，使用本地 PlantUML JAR 校验语法
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, 'src/content/posts');
const VALIDATE_SCRIPT = path.join(__dirname, 'validate-plantuml.sh');

// 提取 Markdown 中的 PlantUML 代码块
function extractPlantUmlBlocks(content, filePath) {
  const blocks = [];
  const regex = /```plantuml\n([\s\S]*?)```/g;
  let match;
  let blockIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    blockIndex++;
    const code = match[1].trim();
    const lineNumber = content.substring(0, match.index).split('\n').length;

    blocks.push({
      file: filePath,
      line: lineNumber,
      index: blockIndex,
      code: code
    });
  }

  return blocks;
}

// 全局唯一计数器：block.index 只在单个文件内递增，跨文件会重复，
// 导致全量校验时多个 block 共用同一临时文件路径而相互干扰。
// 用进程级自增序号保证临时文件名全局唯一。
let tempFileSeq = 0;

// 校验单个 PlantUML 代码块
function validateBlock(block) {
  const tempFile = `/tmp/plantuml-check-${process.pid}-${tempFileSeq++}.puml`;

  try {
    // 写入临时文件
    fs.writeFileSync(tempFile, block.code, 'utf-8');

    // 调用校验脚本（使用 pipe 捕获输出，避免终端闪烁）
    const result = execSync(`bash "${VALIDATE_SCRIPT}" "${tempFile}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']  // 捕获 stdout 和 stderr
    });

    // 清理
    fs.unlinkSync(tempFile);

    return {
      valid: true,
      block: block,
      message: '✅ 语法正确'
    };
  } catch (error) {
    // 清理
    try { fs.unlinkSync(tempFile); } catch {}

    // 提取错误输出（去掉脚本前缀）
    let errorMessage = error.stdout || error.stderr || error.message;
    // 移除临时文件路径相关的行
    errorMessage = errorMessage.split('\n')
      .filter(line => !line.includes(tempFile) && !line.includes('Command failed'))
      .join('\n')
      .trim();

    return {
      valid: false,
      block: block,
      message: '❌ 语法错误',
      error: errorMessage
    };
  }
}

// 获取 git 变更的文章文件名（未跟踪 / 已修改 / 已暂存），相对 posts 目录
// 返回 null 表示无法获取（非 git 仓库或 git 不可用）
function getChangedPostFiles() {
  let output;
  try {
    output = execSync('git status --porcelain', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }

  const POSTS_PREFIX = 'src/content/posts/';
  const files = new Set();

  for (const rawLine of output.split('\n')) {
    if (!rawLine.trim()) continue;

    // porcelain 格式: "XY <path>"，重命名为 "XY old -> new"
    let pathPart = rawLine.slice(3);
    const arrowIdx = pathPart.indexOf(' -> ');
    if (arrowIdx !== -1) pathPart = pathPart.slice(arrowIdx + 4);
    pathPart = pathPart.replace(/^"(.*)"$/, '$1'); // 去掉含特殊字符时的引号

    if (pathPart.startsWith(POSTS_PREFIX) && pathPart.endsWith('.md')) {
      files.add(pathPart.slice(POSTS_PREFIX.length));
    }
  }

  return [...files];
}

// 扫描文章中的 PlantUML 代码块
// fileNames 为 undefined 时扫描全部文章，否则只扫描指定文件
function scanArticles(fileNames) {
  const blocks = [];

  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`❌ 文章目录不存在: ${POSTS_DIR}`);
    process.exit(2);
  }

  const files = fileNames ?? fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    if (!fs.existsSync(filePath)) continue; // 跳过已删除的文件
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileBlocks = extractPlantUmlBlocks(content, file);
    blocks.push(...fileBlocks);
  }

  return blocks;
}

// 解析命令行参数，决定要校验哪些文章
// 返回 { files, scope }：files 为 undefined 表示全量
function resolveTargetFiles() {
  const args = process.argv.slice(2);
  const allFlag = args.includes('--all') || args.includes('-a');
  const explicitFiles = args
    .filter(a => !a.startsWith('-'))
    .map(a => path.basename(a)); // 容忍传入完整路径，只取文件名

  // 1. 显式指定文件优先
  if (explicitFiles.length > 0) {
    return { files: explicitFiles, scope: `指定的 ${explicitFiles.length} 篇文章` };
  }

  // 2. --all 全量校验
  if (allFlag) {
    return { files: undefined, scope: '全部文章' };
  }

  // 3. 默认：只校验 git 变更（新增 / 修改 / 未跟踪）的文章
  const changed = getChangedPostFiles();
  if (changed === null) {
    console.log('⚠️  无法读取 git 状态，回退为全量校验\n');
    return { files: undefined, scope: '全部文章（git 不可用）' };
  }
  return { files: changed, scope: '本次变更的文章' };
}

// 主函数
function main() {
  const { files, scope } = resolveTargetFiles();

  console.log(`🔍 扫描 PlantUML 代码块（范围：${scope}）...\n`);

  if (files && files.length === 0) {
    console.log('ℹ️  没有变更的文章需要校验');
    console.log('💡 如需校验全部文章：pnpm check-plantuml --all');
    process.exit(0);
  }

  const blocks = scanArticles(files);

  if (blocks.length === 0) {
    console.log('ℹ️  未找到 PlantUML 代码块');
    process.exit(0);
  }

  console.log(`找到 ${blocks.length} 个 PlantUML 代码块\n`);
  console.log('🔧 使用本地 PlantUML JAR 校验...\n');

  const results = blocks.map(validateBlock);

  // 统计
  const valid = results.filter(r => r.valid);
  const invalid = results.filter(r => !r.valid);

  // 输出结果
  if (valid.length > 0) {
    console.log('✅ 语法正确的代码块:');
    valid.forEach(r => {
      console.log(`  - ${r.block.file}:${r.block.line} (第 ${r.block.index} 个)`);
    });
    console.log('');
  }

  if (invalid.length > 0) {
    console.log('❌ 语法错误的代码块:');
    invalid.forEach(r => {
      console.log(`\n  📄 ${r.block.file}:${r.block.line} (第 ${r.block.index} 个)`);
      console.log('  ' + '-'.repeat(60));

      // 解析错误行号
      const errorLineMatch = r.error.match(/Error line (\d+)/);
      if (errorLineMatch) {
        const errorLine = parseInt(errorLineMatch[1]);
        const codeLines = r.block.code.split('\n');

        // 显示错误行及其上下文
        const startLine = Math.max(0, errorLine - 3);
        const endLine = Math.min(codeLines.length, errorLine + 2);

        console.log(`  错误位置: PlantUML 代码第 ${errorLine} 行`);
        console.log('');
        for (let i = startLine; i < endLine; i++) {
          const lineNum = i + 1;
          const marker = lineNum === errorLine ? '❯' : ' ';
          console.log(`  ${marker} ${String(lineNum).padStart(3)} | ${codeLines[i]}`);
        }
      } else {
        // 如果没有行号信息，显示错误信息
        const errorLines = r.error.split('\n').filter(l => l.trim());
        errorLines.forEach(line => console.log('  ' + line));
      }
      console.log('  ' + '-'.repeat(60));
    });
    console.log('');
  }

  // 总结
  console.log('='.repeat(60));
  console.log(`总计: ${blocks.length} 个代码块`);
  console.log(`  ✅ 正确: ${valid.length}`);
  console.log(`  ❌ 错误: ${invalid.length}`);
  console.log('='.repeat(60));

  if (invalid.length > 0) {
    console.log('\n💡 提示: 请修复上述语法错误后再构建');
    process.exit(1);
  } else {
    console.log('\n✨ 所有 PlantUML 代码块语法正确！');
    process.exit(0);
  }
}

main();
