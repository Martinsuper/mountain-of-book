import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VALIDATE_SCRIPT } from './paths.js';

export interface PlantUmlBlockResult {
  index: number;
  line: number;
  ok: boolean;
  error?: string;
}

export interface PlantUmlCheckResult {
  file: string;
  blockCount: number;
  ok: boolean;
  blocks: PlantUmlBlockResult[];
}

/** 提取 Markdown 中所有 ```plantuml 代码块，返回代码和起始行号 */
export function extractPlantUmlBlocks(content: string): Array<{ code: string; line: number }> {
  const blocks: Array<{ code: string; line: number }> = [];
  const regex = /```plantuml\r?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      code: match[1].trim(),
      line: content.slice(0, match.index).split('\n').length,
    });
  }
  return blocks;
}

/** 校验单个 PlantUML 代码块（调用项目自带的 validate-plantuml.sh + 本地 JAR） */
function validateBlock(code: string): Promise<Error | null> {
  const tempFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'puml-')), 'check.puml');
  fs.writeFileSync(tempFile, code, 'utf-8');
  return new Promise((resolve) => {
    execFile('bash', [VALIDATE_SCRIPT, tempFile], { timeout: 30_000 }, (err, stdout, stderr) => {
      fs.rmSync(path.dirname(tempFile), { recursive: true, force: true });
      if (!err) return resolve(null);
      const out = ((stdout ?? '') + '\n' + (stderr ?? '')).trim();
      resolve(new Error(out || err.message));
    });
  });
}

/**
 * 校验一篇或多篇 Markdown 中的 PlantUML 语法。
 * 无 PlantUML 代码块时 blockCount 为 0 并视为通过。
 */
export async function checkMarkdownFiles(files: Array<{ slug: string; content: string }>): Promise<PlantUmlCheckResult[]> {
  const results: PlantUmlCheckResult[] = [];
  for (const { slug, content } of files) {
    const blocks = extractPlantUmlBlocks(content);
    const blockResults: PlantUmlBlockResult[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const err = await validateBlock(blocks[i].code);
      blockResults.push({ index: i + 1, line: blocks[i].line, ok: err === null, error: err?.message });
    }
    results.push({
      file: slug,
      blockCount: blocks.length,
      ok: blockResults.every((b) => b.ok),
      blocks: blockResults,
    });
  }
  return results;
}
