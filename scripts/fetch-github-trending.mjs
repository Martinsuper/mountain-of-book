#!/usr/bin/env node

/**
 * 抓取 GitHub Trending 页面，输出 Top 仓库的 JSON 数据
 *
 * 用法：
 *   node scripts/fetch-github-trending.mjs                    # 默认 Top 10
 *   node scripts/fetch-github-trending.mjs 20                 # Top 20
 *   node scripts/fetch-github-trending.mjs 10 weekly          # 本周趋势
 *   node scripts/fetch-github-trending.mjs --filter           # 自动过滤已写过的项目
 *   node scripts/fetch-github-trending.mjs 10 daily --filter  # 组合使用
 *
 * 输出格式：JSON 数组，每项包含 rank, repo, url, description, language, totalStars, forks, starsToday, covered
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const TRENDING_URL = 'https://github.com/trending';
const POSTS_DIR = join(process.cwd(), 'src/content/posts');

/**
 * 扫描已有博客文章，提取文中提到的所有 GitHub 仓库
 * @returns {Set<string>} 已覆盖的仓库集合，格式 "owner/repo"
 */
function scanCoveredRepos() {
  const covered = new Set();

  let files;
  try {
    files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  } catch {
    console.error(`Warning: 无法读取文章目录 ${POSTS_DIR}，跳过已写过滤`);
    return covered;
  }

  // 匹配 GitHub URL 中的 owner/repo
  // 支持: github.com/owner/repo, github.com/owner/repo.git, github.com/owner/repo/
  const repoPattern = /github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+?)(?:\.git|\/|\)|\s|$)/g;

  for (const file of files) {
    try {
      const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
      let match;
      while ((match = repoPattern.exec(content)) !== null) {
        const repo = match[1].toLowerCase();
        // 排除非仓库路径（如 github.com/trending, github.com/features 等）
        if (!repo.includes('/') || repo.split('/').length !== 2) continue;
        covered.add(repo);
      }
    } catch {
      // 跳过无法读取的文件
    }
  }

  return covered;
}

async function fetchTrending(count = 10, since = 'daily') {
  const params = new URLSearchParams({ since });
  const url = `${TRENDING_URL}?${params}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub Trending 请求失败: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  return parseTrending(html, count);
}

function parseTrending(html, count) {
  const results = [];

  // 按 <article class="Box-row"> 分割
  const articles = html.split('<article class="Box-row">').slice(1);

  for (const article of articles.slice(0, count)) {
    const repo = extractRepo(article);
    if (repo) {
      results.push(repo);
    }
  }

  return results;
}

function extractRepo(article) {
  // 提取仓库名 (owner/name)
  const repoMatch = article.match(/href="\/([^"]+)"[^>]*class="Link"/);
  if (!repoMatch) return null;
  const repo = repoMatch[1].trim();

  // 提取描述
  const descMatch = article.match(/<p class="col-9[^"]*">\s*([\s\S]*?)\s*<\/p>/);
  let description = descMatch ? descMatch[1].trim() : '';
  // 清理 HTML 标签
  description = description.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  // 提取编程语言
  const langMatch = article.match(/<span itemprop="programmingLanguage">([\s\S]*?)<\/span>/);
  const language = langMatch ? langMatch[1].trim() : null;

  // 提取总星标数 — 数字在 </svg> 和 </a> 之间
  const totalStarsMatch = article.match(
    /href="\/[^"]*\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)\s*<\/a>/
  );
  const totalStars = totalStarsMatch
    ? parseInt(totalStarsMatch[1].replace(/,/g, ''), 10)
    : null;

  // 提取 fork 数 — 同样在 </svg> 和 </a> 之间
  const forksMatch = article.match(
    /href="\/[^"]*\/forks"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)\s*<\/a>/
  );
  const forks = forksMatch ? parseInt(forksMatch[1].replace(/,/g, ''), 10) : null;

  // 提取今日新增星标
  const starsTodayMatch = article.match(/([\d,]+)\s*stars?\s*today/i);
  const starsToday = starsTodayMatch
    ? parseInt(starsTodayMatch[1].replace(/,/g, ''), 10)
    : null;

  return {
    repo,
    url: `https://github.com/${repo}`,
    description,
    language,
    totalStars,
    forks,
    starsToday,
  };
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    count: 10,
    since: 'daily',
    filter: false,
  };

  for (const arg of args) {
    if (arg === '--filter') {
      result.filter = true;
    } else if (arg === 'daily' || arg === 'weekly' || arg === 'monthly') {
      result.since = arg;
    } else if (/^\d+$/.test(arg)) {
      result.count = parseInt(arg, 10);
    }
  }

  return result;
}

// 主入口
const opts = parseArgs();

try {
  // 多抓一些，确保过滤后还有足够的数量
  const fetchCount = opts.filter ? opts.count * 3 : opts.count;
  const repos = await fetchTrending(fetchCount, opts.since);

  let covered = new Set();
  if (opts.filter) {
    covered = scanCoveredRepos();
  }

  // 标记已覆盖的项目，并按需过滤
  const processed = repos.map(r => {
    const isCovered = covered.has(r.repo.toLowerCase());
    return { ...r, covered: isCovered };
  });

  // 过滤模式下，只保留未覆盖的，截断到请求数量
  const output = opts.filter
    ? processed.filter(r => !r.covered).slice(0, opts.count)
    : processed.slice(0, opts.count);

  // 重新编号 rank
  const ranked = output.map((r, i) => ({ rank: i + 1, ...r }));

  // 如果开启过滤，输出覆盖信息到 stderr
  if (opts.filter) {
    const filteredCount = processed.filter(r => r.covered).length;
    if (filteredCount > 0) {
      const filteredRepos = processed.filter(r => r.covered).map(r => r.repo);
      console.error(`[filter] 已过滤 ${filteredCount} 个已写过的项目: ${filteredRepos.join(', ')}`);
    }
  }

  console.log(JSON.stringify(ranked, null, 2));
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
