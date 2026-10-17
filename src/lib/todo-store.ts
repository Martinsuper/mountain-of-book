import { supabase } from './supabase';

/**
 * 待办数据的统一存储层。
 *
 * 此前 /todo 页面的四象限数据只保存在浏览器 localStorage（todo_quadrant_data）。
 * 接入账号后，Supabase `user_todos` 是登录态的权威存储，localStorage 全程保留
 * 镜像：未登录、云端暂时不可用或登出后，页面无缝退回本地模式，数据不丢失。
 */

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  quadrant: 1 | 2 | 3 | 4;
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  completed: boolean;
  completedAt?: number;
  priority: 'high' | 'medium' | 'low';
}

export interface TodoStorage {
  items: TodoItem[];
  version: number;
  lastUpdated: number;
}

export const TODO_STORAGE_KEY = 'todo_quadrant_data';
export const TODO_STORAGE_VERSION = 1;
/** 导入过本地数据的标记，防止重复询问 */
export const TODO_IMPORT_FLAG_KEY = 'todo_quadrant_imported';
/** 本次会话内暂不导入的标记 */
export const TODO_SKIP_IMPORT_KEY = 'todo_quadrant_import_skip';

// 与迁移后的 user_todos 表列一一对应
export interface UserTodoRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  quadrant: number;
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TodoRowInsert = Omit<UserTodoRow, 'id'> & { id?: string };
export type TodoRowUpdate = Partial<Pick<UserTodoRow, 'title' | 'description' | 'quadrant' | 'priority' | 'due_date' | 'completed' | 'completed_at' | 'updated_at'>>;

export interface TodoDiff {
  inserts: TodoItem[];
  updates: TodoItem[];
  deletes: string[];
}

// ============ localStorage 镜像 ============

export function readLocalTodos(): TodoStorage {
  try {
    const data = localStorage.getItem(TODO_STORAGE_KEY);
    if (!data) return { items: [], version: TODO_STORAGE_VERSION, lastUpdated: Date.now() };
    const parsed = JSON.parse(data) as Partial<TodoStorage>;
    return parsed.version === TODO_STORAGE_VERSION && Array.isArray(parsed.items)
      ? { items: parsed.items as TodoItem[], version: TODO_STORAGE_VERSION, lastUpdated: parsed.lastUpdated ?? Date.now() }
      : { items: [], version: TODO_STORAGE_VERSION, lastUpdated: Date.now() };
  } catch {
    return { items: [], version: TODO_STORAGE_VERSION, lastUpdated: Date.now() };
  }
}

export function writeLocalTodos(data: TodoStorage): void {
  data.lastUpdated = Date.now();
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(data));
}

export function cloneTodoItems(items: TodoItem[]): TodoItem[] {
  return items.map(item => ({ ...item }));
}

// ============ ID ============

/** 新条目一律使用 UUID，与云端主键一致；旧格式 ID 只存在于本地历史数据。 */
export function newTodoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const sfc = (n: number) => Math.floor(Math.random() * n).toString(16).padStart(n === 16 ? 4 : 12, '0');
  return `${sfc(1e15)}-${sfc(16)}-4${sfc(16).slice(1)}-${(8 | Math.random() * 4).toString(16)}-${sfc(1e15)}`;
}

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ============ 行 <-> 条目 转换 ============

type SelectedRow = Pick<UserTodoRow, 'id' | 'title' | 'completed' | 'created_at' | 'updated_at'> & {
  description: string | null;
  quadrant: number | null;
  priority: string | null;
  due_date: string | null;
  completed_at: string | null;
};

const toIso = (ms: number): string => new Date(ms).toISOString();

export function rowToTodoItem(row: SelectedRow): TodoItem {
  const quadrant = row.quadrant && row.quadrant >= 1 && row.quadrant <= 4 ? row.quadrant : 1;
  const priority: TodoItem['priority'] = row.priority === 'high' || row.priority === 'low' ? row.priority : 'medium';
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    quadrant: quadrant as TodoItem['quadrant'],
    priority,
    dueDate: row.due_date ? new Date(row.due_date).getTime() : undefined,
    completed: row.completed,
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export function todoItemToInsertRow(item: TodoItem, userId: string): TodoRowInsert {
  return {
    id: item.id,
    user_id: userId,
    title: item.title,
    description: item.description ?? null,
    quadrant: item.quadrant,
    priority: item.priority,
    due_date: item.dueDate ? toIso(item.dueDate) : null,
    completed: item.completed,
    completed_at: item.completedAt ? toIso(item.completedAt) : null,
    created_at: toIso(item.createdAt),
    updated_at: toIso(item.updatedAt),
  };
}

export function todoItemToPatchRow(item: TodoItem): TodoRowUpdate {
  return {
    title: item.title,
    description: item.description ?? null,
    quadrant: item.quadrant,
    priority: item.priority,
    due_date: item.dueDate ? toIso(item.dueDate) : null,
    completed: item.completed,
    completed_at: item.completedAt ? toIso(item.completedAt) : null,
    updated_at: toIso(item.updatedAt),
  };
}

// ============ 差异计算（内容级比较，与 updatedAt 取值无关） ============

function todoKey(item: TodoItem): string {
  return JSON.stringify([
    item.title, item.description ?? null, item.quadrant, item.priority,
    item.dueDate ?? null, item.completed, item.completedAt ?? null,
  ]);
}

export function diffTodoItems(before: TodoItem[], after: TodoItem[]): TodoDiff {
  const beforeMap = new Map(before.map(item => [item.id, item]));
  const afterMap = new Map(after.map(item => [item.id, item]));
  const inserts: TodoItem[] = [];
  const updates: TodoItem[] = [];
  const deletes: string[] = [];
  afterMap.forEach((item, id) => {
    const prev = beforeMap.get(id);
    if (!prev) { inserts.push(item); return; }
    if (todoKey(prev) !== todoKey(item)) updates.push(item);
  });
  beforeMap.forEach((_, id) => { if (!afterMap.has(id)) deletes.push(id); });
  return { inserts, updates, deletes };
}

// ============ Supabase 同步适配器 ============
// 站点未配置 Supabase 环境变量时为 null，页面自动使用纯本地模式。

export const remoteTodoSync = supabase ? {
  /** 拉取当前账号全部待办；失败返回 null（调用方回退本地缓存）。 */
  async fetch(userId: string): Promise<TodoItem[] | null> {
    const { data, error } = await supabase!
      .from('user_todos')
      .select('id,title,description,quadrant,priority,due_date,completed,completed_at,created_at,updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error || !data) return null;
    return data.map(rowToTodoItem);
  },

  /** 按差异推送一批变更，任一步失败即抛错，由调用方保留差异重试。 */
  async push(userId: string, diff: TodoDiff): Promise<void> {
    if (diff.inserts.length) {
      const { error } = await supabase!.from('user_todos').insert(diff.inserts.map(item => todoItemToInsertRow(item, userId)));
      if (error) throw error;
    }
    for (const item of diff.updates) {
      const { error } = await supabase!.from('user_todos').update(todoItemToPatchRow(item)).eq('id', item.id).eq('user_id', userId);
      if (error) throw error;
    }
    if (diff.deletes.length) {
      const { error } = await supabase!.from('user_todos').delete().in('id', diff.deletes).eq('user_id', userId);
      if (error) throw error;
    }
  },
} : null;

export type RemoteTodoSync = NonNullable<typeof remoteTodoSync>;
