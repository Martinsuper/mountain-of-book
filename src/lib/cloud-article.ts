import { supabase, configurationMessage } from './supabase';
const status = document.getElementById('account-status')!;
const article = document.getElementById('private-article')!;
const body = document.getElementById('private-body')!;
const title = document.getElementById('private-title')!;
const saveStatus = document.getElementById('private-save-status')!;
const toc = document.querySelector('#cloud-toc ul')!;
let generation = 0;
function clear() {
  generation++; article.hidden = true; body.replaceChildren(); title.textContent = ''; toc.replaceChildren();
  saveStatus.textContent = ''; status.hidden = false;
  document.title = '文章 | 书山有路';
  for (const id of ['article-date', 'article-reading-time', 'article-visibility']) document.getElementById(id)!.textContent = '';
}
async function load() {
  clear(); const current = generation;
  if (!supabase) { status.textContent = configurationMessage; return; }
  const id = new URLSearchParams(location.search).get('id');
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { status.textContent = '文章地址无效。'; return; }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (current !== generation) return;
    // Anonymous SELECT is intentional for published public rows; RLS hides all private fields.
    const { data, error } = await supabase.from('articles').select('id,title,body,status,visibility,created_at').eq('id', id).maybeSingle();
    if (current !== generation) return;
    if (error) throw error;
    if (!data) { status.textContent = user ? '文章不存在或当前账号无权访问。' : '文章不存在或需要登录后访问，请先到个人中心登录。'; return; }
    const [{ marked }, { default: DOMPurify }] = await Promise.all([import('marked'), import('dompurify')]);
    if (current !== generation) return;
    // No embeds/images/remote diagrams: confidential Markdown must not contact third parties.
    body.innerHTML = DOMPurify.sanitize(marked.parse(data.body, { async: false }), { ALLOWED_TAGS: ['p','br','h2','h3','h4','h5','h6','ul','ol','li','strong','em','del','blockquote','pre','code','hr','table','thead','tbody','tr','th','td','a'], ALLOWED_ATTR: ['href','title'], ALLOW_DATA_ATTR: false });
    body.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href)) link.removeAttribute('href');
      link.rel = 'noreferrer noopener'; link.referrerPolicy = 'no-referrer';
    });
    body.querySelectorAll('h2,h3,h4').forEach((heading, index) => {
      heading.id = `section-${index}`;
      const item = document.createElement('li'); const link = document.createElement('a');
      link.textContent = heading.textContent; link.href = `#${heading.id}`; item.append(link); toc.append(item);
    });
    title.textContent = data.title; document.title = `${data.title} | 书山有路`;
    const date = document.getElementById('article-date') as HTMLTimeElement;
    date.dateTime = data.created_at; date.textContent = new Date(data.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('article-reading-time')!.textContent = `· ${Math.max(1, Math.ceil(data.body.length / 500))} 分钟阅读`;
    document.getElementById('article-visibility')!.textContent = data.visibility === 'public' ? '公开' : data.visibility === 'restricted' ? '指定账号可见' : '登录可见';
    article.hidden = false; document.dispatchEvent(new Event('article:rendered')); status.textContent = data.status === 'draft' ? '草稿预览：尚未发布。' : ''; status.hidden = data.status !== 'draft';
    if (!user) return;
    // Preserve the existing reading-history path for legacy links.
    const path = `${location.pathname}?id=${id}`;
    const history = await supabase.from('reading_history').upsert({ user_id: user.id, article_path: path, title: data.title, updated_at: new Date().toISOString() }, { onConflict: 'user_id,article_path' });
    if (current !== generation) return;
    saveStatus.textContent = history.error ? '阅读记录同步失败' : '阅读记录已同步';
  } catch {
    if (current === generation) { clear(); status.textContent = '文章加载失败，请检查网络后刷新重试。'; }
  }
}
supabase?.auth.onAuthStateChange(() => { clear(); setTimeout(() => void load(), 0); });
window.addEventListener('pagehide', clear);
window.addEventListener('pageshow', event => { if (event.persisted) void load(); });
void load();
