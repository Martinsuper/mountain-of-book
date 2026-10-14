import { APPLE_CN_URL, normalizeAppleUrl, parseAppleCalendar, eventsOnDate } from './apple-calendar';
import type { HolidayCalendar } from './apple-calendar';
const KEY = 'todo_apple_calendar_subscription_v1';
const HOUR = 3600000;
interface Saved { url: string; enabled: boolean; ics?: string; fetchedAt?: number }
export function initCalendarSubscription(onChange: () => void) {
  const root = document.getElementById('calendarSubscription')!;
  const urlInput = document.getElementById('subscriptionUrl') as HTMLInputElement;
  const status = document.getElementById('subscriptionStatus')!;
  const toggle = document.getElementById('subscriptionEnabled') as HTMLInputElement;
  const refresh = document.getElementById('subscriptionRefresh') as HTMLButtonElement;
  const details = document.getElementById('calendarDayDetails')!;
  const endpoint = root.dataset.proxy || '';
  let saved: Saved | null = null, calendar: HolidayCalendar | null = null, busy = false, selected = '', lastAttempt = 0;
  try { const raw = localStorage.getItem(KEY); if (raw) { const data = JSON.parse(raw); normalizeAppleUrl(data.url); saved = { url: APPLE_CN_URL, enabled: data.enabled === true, ics: typeof data.ics === 'string' ? data.ics : undefined, fetchedAt: Number(data.fetchedAt) || 0 }; if (saved.ics) calendar = parseAppleCalendar(saved.ics); } } catch { saved = null; calendar = null; }
  urlInput.value = saved?.url || 'webcal://p10-calendars.icloud.com/holiday/CN_zh.ics';
  function persist() { try { if (saved) localStorage.setItem(KEY, JSON.stringify(saved)); else localStorage.removeItem(KEY); return true; } catch { status.textContent = '浏览器存储不可用，订阅仅在当前页面有效。'; return false; } }
  function updateStatus(message?: string) {
    toggle.checked = saved?.enabled || false; toggle.disabled = !saved;
    refresh.disabled = busy || !saved; urlInput.disabled = busy;
    status.textContent = message || (!saved ? '尚未订阅。' : !saved.enabled ? '订阅已关闭。' : saved.fetchedAt ? `上次成功获取：${new Date(saved.fetchedAt).toLocaleString('zh-CN')}` : '尚未获取数据。');
    if (!endpoint) status.textContent += ' 尚未配置订阅代理，部署后可自动更新。';
  }
  async function sync(force = false, candidate?: string) {
    if (busy) return;
    const startingSaved = saved;
    if (!endpoint) { updateStatus('请先配置 PUBLIC_CALENDAR_PROXY_URL。'); return; }
    if (!candidate && (!saved?.enabled && !force)) return;
    if (!force && saved?.fetchedAt && Date.now() - saved.fetchedAt < HOUR) return;
    if (!force && Date.now() - lastAttempt < HOUR) return;
    busy = true; lastAttempt = Date.now(); updateStatus('正在检查订阅更新…');
    try {
      const address = new URL(endpoint, location.origin); if (force) address.searchParams.set('refresh', '1');
      const response = await fetch(address.href, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`读取失败（HTTP ${response.status}）`);
      const reader = response.body?.getReader(); if (!reader) throw new Error('响应没有日历内容');
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 1024 * 1024) { await reader.cancel(); throw new Error('日历文件超过大小限制'); } chunks.push(value); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const ics = new TextDecoder().decode(bytes), parsed = parseAppleCalendar(ics);
      // 只有完整读取并成功解析后才替换缓存；关闭/移除期间不恢复订阅。
      if (startingSaved !== saved) return;
      saved = { url: candidate || saved!.url, enabled: candidate ? true : saved!.enabled, ics, fetchedAt: Date.now() }; calendar = parsed;
      persist(); onChange(); updateStatus();
    } catch (error) { updateStatus(`${error instanceof Error ? error.message : '更新失败'}。${calendar ? '保留上次成功缓存。' : '暂未获取日历数据。'}`); }
    finally { busy = false; refresh.disabled = !saved; urlInput.disabled = false; toggle.disabled = !saved; toggle.checked = saved?.enabled || false; }

  }
  document.getElementById('subscriptionSave')!.addEventListener('click', () => { try { const url = normalizeAppleUrl(urlInput.value); void sync(true, url); } catch (e) { updateStatus((e as Error).message); } });
  toggle.addEventListener('change', () => { if (!saved) return; saved.enabled = toggle.checked; persist(); updateStatus(); onChange(); if (saved.enabled) void sync(); });
  refresh.addEventListener('click', () => void sync(true));
  document.getElementById('subscriptionRemove')!.addEventListener('click', () => { saved = null; calendar = null; persist(); updateStatus(); onChange(); });
  document.getElementById('calendarDayAdd')!.addEventListener('click', () => { if (selected) root.dispatchEvent(new CustomEvent('calendar-add-date', { detail: selected, bubbles: true })); });
  function select(date: string) {
    selected = date; details.hidden = false;
    document.getElementById('calendarDayTitle')!.textContent = date;
    const list = document.getElementById('calendarDayEvents')!; list.replaceChildren();
    const events = saved?.enabled ? eventsOnDate(calendar, date) : [];
    if (!events.length) { const p = document.createElement('p'); p.textContent = '订阅源未提供当天事件。'; list.append(p); }
    for (const event of events) { const p = document.createElement('p'); p.textContent = event.title; list.append(p); }
  }
  updateStatus(); void sync();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); });
  window.setInterval(() => { if (!document.hidden) void sync(); }, HOUR);
  return { getEvents: (date: string) => saved?.enabled ? eventsOnDate(calendar, date) : [], select, refreshDetails: () => { if (selected) select(selected); } };
}
