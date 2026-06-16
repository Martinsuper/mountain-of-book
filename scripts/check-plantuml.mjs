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

// 校验单个 PlantUML 代码块
function validateBlock(block) {
  const tempFile = `/tmp/plantuml-check-${process.pid}-${block.index}.puml`;

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

// 扫描所有文章
function scanArticles() {
  const blocks = [];

  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`❌ 文章目录不存在: ${POSTS_DIR}`);
    process.exit(2);
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileBlocks = extractPlantUmlBlocks(content, file);
    blocks.push(...fileBlocks);
  }

  return blocks;
}

// 主函数
function main() {
  console.log('🔍 扫描文章中的 PlantUML 代码块...\n');

  const blocks = scanArticles();

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
