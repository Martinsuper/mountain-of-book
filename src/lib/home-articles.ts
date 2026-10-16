import { supabase } from './supabase';
const list = document.getElementById('home-posts')!;
const status = document.getElementById('cloud-feed-status')!;
const empty = document.getElementById('home-empty')!;
const feed = document.getElementById('home-feed')!;
const retry = document.getElementById('home-feed-retry')!;
let generation = 0;
let cancelPending: (() => void) | undefined;
let userID: string | null | undefined;

function clear() {
  generation++;
  cancelPending?.();
  cancelPending = undefined;
  list.querySelectorAll('[data-cloud]').forEach(row => row.remove());
  empty.hidden = list.children.length > 0;
}
function reveal() {
  empty.hidden = list.children.length > 0;
  feed.removeAttribute('data-loading');
  feed.setAttribute('aria-busy', 'false');
}
async function load() {
  clear();
  const current = generation;
  if (!supabase) { reveal(); return; }
  feed.setAttribute('data-loading', '');
  feed.setAttribute('aria-busy', 'true');
  status.textContent = '';
  retry.hidden = true;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    if (current !== generation) return;
    generation++;
    controller.abort();
    cancelPending = undefined;
    status.textContent = '云端文章暂时无法加载，已展示本地文章。';
    retry.hidden = false;
    reveal();
  }, 8000);
  cancelPending = () => { window.clearTimeout(timeout); controller.abort(); };
  try {
    // RLS determines metadata visibility too. Never fetch body for the feed.
    const { data, error } = await supabase.from('articles')
      .select('id,title,visibility,created_at').eq('status', 'published')
      .order('created_at', { ascending: false }).limit(100).abortSignal(controller.signal);
    if (current !== generation) return;
    if (error) throw error;
    for (const row of data || []) {
      const item = document.createElement('li'); item.dataset.cloud = ''; item.dataset.date = row.created_at;
      const article = document.createElement('article'); article.className = 'border-b border-gray-200 dark:border-gray-800 pb-6';
      const meta = document.createElement('div'); meta.className = 'flex items-center gap-3 text-sm text-gray-500 flex-wrap';
      const date = document.createElement('time'); date.dateTime = row.created_at;
      date.textContent = new Date(row.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
      const scope = document.createElement('span'); scope.className = 'px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs';
      scope.textContent = row.visibility === 'public' ? '公开' : row.visibility === 'restricted' ? '指定账号可见' : '登录可见';
      meta.append(date, scope);
      const heading = document.createElement('h2'); heading.className = 'text-xl font-semibold mt-2';
      const link = document.createElement('a'); link.className = 'hover:text-blue-600 dark:hover:text-blue-400';
      link.textContent = row.title; link.href = `/posts/read/?id=${encodeURIComponent(row.id)}`;
      heading.append(link); article.append(meta, heading); item.append(article); list.append(item);
    }
    [...list.children].sort((a, b) => Date.parse((b as HTMLElement).dataset.date!) - Date.parse((a as HTMLElement).dataset.date!)).forEach(row => list.append(row));
    status.textContent = '';
  } catch {
    if (current === generation) {
      status.textContent = '云端文章暂时无法加载，已展示本地文章。';
      retry.hidden = false;
    }
  } finally {
    window.clearTimeout(timeout);
    if (current === generation) {
      cancelPending = undefined;
      reveal();
    }
  }
}
supabase?.auth.onAuthStateChange((event, session) => {
  const nextUserID = session?.user.id ?? null;
  if (event === 'INITIAL_SESSION') { userID = nextUserID; return; }
  // Token refresh and repeated SIGNED_IN events must not clear a stable feed.
  if (nextUserID === userID) return;
  userID = nextUserID;
  clear(); // Remove restricted metadata synchronously on account changes.
  feed.setAttribute('data-loading', '');
  feed.setAttribute('aria-busy', 'true');
  setTimeout(() => void load(), 0);
});
retry.addEventListener('click', () => void load());
window.addEventListener('pagehide', () => { clear(); reveal(); });
window.addEventListener('pageshow', event => { if (event.persisted) void load(); });
void load();
