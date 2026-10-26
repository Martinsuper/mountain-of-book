/**
 * 云端文章（Supabase public.articles 表）读写。
 *
 * 与 Markdown 文章（blog.ts）相互独立：
 * - 没有 slug/分类/标签/description，只有标题 + Markdown 正文
 * - 阅读地址为 /posts/read/?id=<uuid>，浏览器运行时按 RLS 查询
 * - 保存即生效，无需 git 部署
 *
 * 凭据解析优先级：进程环境变量 > BLOG_ROOT/.env.local > BLOG_ROOT/.env。
 * 写入需要站长账号（site_admins 成员）的邮箱 + 密码，由 RLS articles_admin_all 策略把关。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { BLOG_ROOT } from './paths.js';
import { checkBodyStyle } from './frontmatter.js';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CloudStatus = 'draft' | 'published';
export type CloudVisibility = 'authenticated' | 'public' | 'restricted';

export interface CloudArticle {
  id: string;
  title: string;
  body: string;
  status: CloudStatus;
  visibility: CloudVisibility;
  created_at: string;
  updated_at: string;
}

export type CloudArticleMeta = Omit<CloudArticle, 'body'>;

export function readUrl(id: string): string {
  return `/posts/read/?id=${id}`;
}

interface CloudConfig {
  url: string;
  anonKey: string;
  email: string;
  password: string;
}

/** 解析单个 env 文件（兼容 export 前缀与单双引号包裹），文件不存在返回空对象 */
function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[m[1]] = value;
  }
  return vars;
}

/** .env.local 覆盖 .env，进程环境变量优先于所有文件 */
function resolveCloudConfig(): CloudConfig | null {
  const fileVars: Record<string, string> = {
    ...parseEnvFile(path.join(BLOG_ROOT, '.env')),
    ...parseEnvFile(path.join(BLOG_ROOT, '.env.local')),
  };
  const get = (name: string) => process.env[name]?.trim() || fileVars[name] || '';
  const url = get('BLOG_SUPABASE_URL') || get('PUBLIC_SUPABASE_URL');
  const anonKey = get('BLOG_SUPABASE_ANON_KEY') || get('PUBLIC_SUPABASE_ANON_KEY');
  const email = get('BLOG_SUPABASE_ADMIN_EMAIL');
  const password = get('BLOG_SUPABASE_ADMIN_PASSWORD');
  if (!url || !anonKey || !email || !password) return null;
  return { url: url.replace(/\/+$/, ''), anonKey, email, password };
}

export function cloudConfigured(): boolean {
  return resolveCloudConfig() !== null;
}

export function cloudConfigHelp(): string {
  return (
    '云端文章功能未配置。需要在 MCP 配置的 env 中（或 BLOG_ROOT/.env 文件）设置:\n' +
    '- BLOG_SUPABASE_URL / BLOG_SUPABASE_ANON_KEY（或站点同名 PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY）\n' +
    '- BLOG_SUPABASE_ADMIN_EMAIL / BLOG_SUPABASE_ADMIN_PASSWORD（站长账号，site_admins 成员）\n' +
    '未配置时 Markdown 文章工具（list_posts 等）不受影响。'
  );
}

let clientPromise: Promise<SupabaseClient> | null = null;

/** 取已登录站长账号的 Supabase 客户端；凭据缺失抛可读错误，登录失败允许下次重试 */
export async function requireCloudClient(): Promise<SupabaseClient> {
  const config = resolveCloudConfig();
  if (!config) throw new Error(cloudConfigHelp());
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = createClient(config.url, config.anonKey, {
        auth: { persistSession: false, autoRefreshToken: true },
      });
      const { error } = await client.auth.signInWithPassword({
        email: config.email,
        password: config.password,
      });
      if (error) {
        throw new Error(
          `Supabase 站长账号登录失败: ${error.message}。请检查 BLOG_SUPABASE_ADMIN_EMAIL / BLOG_SUPABASE_ADMIN_PASSWORD，且该账号在 site_admins 中`,
        );
      }
      return client;
    })().catch((e) => {
      clientPromise = null;
      throw e;
    });
  }
  return clientPromise;
}

/** PostgREST 错误 → 可读异常 */
function throwIfError(
  error: { message: string; details?: string | null; hint?: string | null; code?: string } | null,
): void {
  if (!error) return;
  const parts = [error.message];
  if (error.details) parts.push(`details: ${error.details}`);
  if (error.hint) parts.push(`hint: ${error.hint}`);
  throw new Error(`Supabase 操作失败: ${parts.join('; ')}`);
}

const META_FIELDS = 'id,title,status,visibility,created_at,updated_at';
const FULL_FIELDS = `${META_FIELDS},body`;

/**
 * 云端阅读页支持 PlantUML（非公开内容须确认外发），Mermaid 仍显示源码；
 * 加上 CLAUDE.md 通用正文风格检查，全部为软警告（styleWarnings）。
 */
function bodyWarnings(body: string): string[] {
  const warnings: string[] = [];
  if (/```[ \t]*plantuml/i.test(body)) {
    warnings.push('PlantUML 使用 www.plantuml.com 渲染；已发布公开文章自动加载，非公开文章和编辑预览须读者确认后发送图表源码，请勿在图表中包含敏感信息');
  }
  if (/```[ \t]*mermaid/i.test(body)) {
    warnings.push(
      '云端阅读页暂不渲染 Mermaid 图表，相关代码块会显示为纯文本；如需 Mermaid 图表请发布为 Markdown 文章',
    );
  }
  return [...warnings, ...checkBodyStyle(body)];
}

export interface ListCloudOpts {
  status?: CloudStatus;
  visibility?: CloudVisibility;
  keyword?: string;
  limit?: number;
}

export async function listCloudPosts(opts: ListCloudOpts): Promise<CloudArticleMeta[]> {
  const client = await requireCloudClient();
  let q = client.from('articles').select(META_FIELDS).order('created_at', { ascending: false });
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.visibility) q = q.eq('visibility', opts.visibility);
  if (opts.keyword) q = q.ilike('title', `%${opts.keyword}%`);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  throwIfError(error);
  return (data ?? []).map((row) => ({ ...row, readUrl: readUrl(row.id) }));
}

export interface CloudSearchHit {
  id: string;
  title: string;
  status: CloudStatus;
  visibility: CloudVisibility;
  updated_at: string;
  readUrl: string;
  matchedIn: string;
  snippet: string;
}

/** 检索云端文章（标题权重 5、正文权重 1，与 Markdown searchPosts 计分一致） */
export async function searchCloudPosts(query: string, limit = 10): Promise<CloudSearchHit[]> {
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return [];
  const client = await requireCloudClient();
  // 站点为个人博客规模（几十篇），一次拉全量后客户端计分，语义与 Markdown 检索保持一致
  const { data, error } = await client
    .from('articles')
    .select(FULL_FIELDS)
    .order('updated_at', { ascending: false })
    .limit(500);
  throwIfError(error);

  const results: Array<CloudSearchHit & { score: number }> = [];
  for (const row of data ?? []) {
    const title = row.title.toLowerCase();
    const body = row.body.toLowerCase();
    let score = 0;
    let matchedIn = '';
    for (const kw of keywords) {
      if (title.includes(kw)) {
        score += 5;
        matchedIn = matchedIn ? `${matchedIn},title` : 'title';
      }
      if (body.includes(kw)) {
        score += 1;
        matchedIn = matchedIn ? `${matchedIn},body` : 'body';
      }
    }
    if (score === 0) continue;
    const lines: string[] = row.body.split('\n');
    const hitLine = lines.findIndex((l) => keywords.some((kw) => l.toLowerCase().includes(kw)));
    const snippet =
      hitLine >= 0 ? lines.slice(hitLine, hitLine + 2).join(' ').slice(0, 200) : row.title.slice(0, 200);
    results.push({
      id: row.id,
      title: row.title,
      status: row.status,
      visibility: row.visibility,
      updated_at: row.updated_at,
      readUrl: readUrl(row.id),
      matchedIn,
      snippet,
      score,
    });
  }
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...hit }) => hit);
}

function assertUuid(id: string): void {
  if (!UUID_PATTERN.test(id)) throw new Error(`非法文章 id: ${id}（应为 UUID，可从 list_cloud_posts 获得）`);
}

export async function readCloudPost(id: string): Promise<CloudArticle & { readUrl: string }> {
  assertUuid(id);
  const client = await requireCloudClient();
  const { data, error } = await client.from('articles').select(FULL_FIELDS).eq('id', id).maybeSingle();
  throwIfError(error);
  if (!data) throw new Error(`云端文章不存在: ${id}`);
  return { ...data, readUrl: readUrl(id) };
}

export interface CreateCloudArgs {
  title: string;
  body?: string;
  status?: CloudStatus;
  visibility?: Exclude<CloudVisibility, 'restricted'>;
}

export async function createCloudPost(args: CreateCloudArgs): Promise<{
  id: string;
  title: string;
  status: CloudStatus;
  visibility: CloudVisibility;
  readUrl: string;
  created: boolean;
  styleWarnings: string[];
}> {
  const client = await requireCloudClient();
  const body = args.body ?? '';
  const { data, error } = await client
    .from('articles')
    .insert({
      title: args.title.trim(),
      body,
      status: args.status ?? 'draft',
      visibility: args.visibility ?? 'authenticated',
    })
    .select(META_FIELDS)
    .single();
  throwIfError(error);
  if (!data) throw new Error('创建云端文章失败：服务端未返回新文章');
  const hints: string[] = [];
  if (data.status === 'draft') hints.push('草稿已创建。发布调用 set_cloud_status(status: "published")，保存即生效，无需 git 部署');
  return {
    ...data,
    readUrl: readUrl(data.id),
    created: true,
    styleWarnings: [...hints, ...bodyWarnings(body)],
  };
}

export interface UpdateCloudArgs {
  id: string;
  title?: string;
  body?: string;
}

export async function updateCloudPost(args: UpdateCloudArgs): Promise<{
  id: string;
  title: string;
  status: CloudStatus;
  visibility: CloudVisibility;
  readUrl: string;
  updated: boolean;
  styleWarnings: string[];
}> {
  assertUuid(args.id);
  if (args.title === undefined && args.body === undefined) {
    throw new Error('请至少提供 title 或 body 之一');
  }
  const client = await requireCloudClient();
  const patch: { title?: string; body?: string } = {};
  if (args.title !== undefined) patch.title = args.title.trim();
  if (args.body !== undefined) patch.body = args.body;
  const { data, error } = await client
    .from('articles')
    .update(patch)
    .eq('id', args.id)
    .select(META_FIELDS)
    .maybeSingle();
  throwIfError(error);
  if (!data) throw new Error(`云端文章不存在: ${args.id}`);
  return {
    ...data,
    readUrl: readUrl(args.id),
    updated: true,
    styleWarnings: args.body !== undefined ? bodyWarnings(args.body) : [],
  };
}

async function updateArticle(
  id: string,
  patch: Partial<Pick<CloudArticle, 'status' | 'visibility'>>,
): Promise<CloudArticleMeta & { readUrl: string }> {
  assertUuid(id);
  const client = await requireCloudClient();
  const { data, error } = await client.from('articles').update(patch).eq('id', id).select(META_FIELDS).maybeSingle();
  throwIfError(error);
  if (!data) throw new Error(`云端文章不存在: ${id}`);
  return { ...data, readUrl: readUrl(id) };
}

export async function setCloudStatus(
  id: string,
  status: CloudStatus,
): Promise<{ id: string; status: CloudStatus }> {
  const row = await updateArticle(id, { status });
  return { id: row.id, status: row.status };
}

/** restricted 是历史存量可见范围：只允许已是 restricted 的文章保持原值，不给新文章开放 */
export async function setCloudVisibility(
  id: string,
  visibility: CloudVisibility,
): Promise<{ id: string; visibility: CloudVisibility }> {
  if (visibility === 'restricted') {
    const current = await readCloudPost(id);
    if (current.visibility !== 'restricted') {
      throw new Error('restricted 为历史遗留可见范围，仅限原本就是 restricted 的文章保持不变。新文章请用 authenticated（登录可见）或 public（公开）');
    }
  }
  const row = await updateArticle(id, { visibility });
  return { id: row.id, visibility: row.visibility };
}

export async function deleteCloudPost(
  id: string,
  confirm: boolean,
): Promise<{ id: string; deleted: boolean }> {
  if (!confirm) throw new Error('删除云端文章需要显式传 confirm: true 以防误删（数据库行，删除后不可恢复）');
  assertUuid(id);
  const client = await requireCloudClient();
  const { data, error } = await client.from('articles').delete().eq('id', id).select('id');
  throwIfError(error);
  if (!data || data.length === 0) throw new Error(`云端文章不存在: ${id}`);
  return { id, deleted: true };
}

/** 给 restricted 文章追加授权用户（复用站点已有的 admin_grant_article RPC，按邮箱定位用户） */
export async function grantCloudPost(
  id: string,
  email: string,
): Promise<{ id: string; email: string; granted: boolean }> {
  assertUuid(id);
  const client = await requireCloudClient();
  const { error } = await client.rpc('admin_grant_article', { article: id, email: email.trim() });
  if (error) {
    if (error.code === 'P0002' || /not found/i.test(error.message)) {
      throw new Error(`未找到邮箱 "${email}" 对应的注册用户（该用户需先在站点完成注册）`);
    }
    throwIfError(error);
  }
  return { id, email: email.trim(), granted: true };
}
