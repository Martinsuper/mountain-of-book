// Apple 公共节假日日历：仅支持全天事件与该来源使用的简单 YEARLY 规则。
export const APPLE_CN_URL = 'https://p10-calendars.icloud.com/holiday/CN_zh.ics';
export interface HolidayEvent { uid: string; title: string; start: string; end: string; kind: 'holiday' | 'workday' | 'event'; count: number; interval: number }
export interface HolidayCalendar { name: string; events: HolidayEvent[] }
const text = (s: string) => s.replace(/\\[nN]/g, '\n').replace(/\\([,;\\])/g, '$1');
const key = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
function valid(s: string) { const d = new Date(s + 'T00:00:00Z'); return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; }
export function normalizeAppleUrl(input: string): string {
  const url = new URL(input.trim().replace(/^webcal:\/\//i, 'https://'));
  if (url.href !== APPLE_CN_URL) throw new Error('目前仅支持 Apple 中国大陆节假日公开订阅地址。');
  return url.href;
}
export function parseAppleCalendar(ics: string): HolidayCalendar {
  if (ics.length > 1024 * 1024 || !ics.includes('BEGIN:VCALENDAR') || !ics.includes('END:VCALENDAR')) throw new Error('订阅源不是完整的 ICS 日历。');
  const lines = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events: HolidayEvent[] = []; let props: Record<string, string> | null = null; let name = '中国大陆节假日';
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { props = {}; continue; }
    if (line === 'END:VEVENT') {
      if (!props) throw new Error('日历事件结构不完整。');
      const p = props; props = null;
      if (p.STATUS === 'CANCELLED') continue;
      if (!/^\d{8}$/.test(p.DTSTART || '') || !p.SUMMARY) throw new Error('该订阅包含暂不支持的非全天事件。');
      const start = key(p.DTSTART); if (!valid(start)) throw new Error('日历日期无效。');
      let end = p.DTEND ? key(p.DTEND) : new Date(new Date(start + 'T00:00:00Z').getTime() + 86400000).toISOString().slice(0, 10);
      if (!valid(end) || end <= start || (p.DTEND && !/^\d{8}$/.test(p.DTEND))) throw new Error('日历结束日期无效。');
      let count = 1, interval = 1;
      if (p.RRULE) {
        const rule = Object.fromEntries(p.RRULE.split(';').map(part => part.split('=')));
        if (rule.FREQ !== 'YEARLY' || !rule.COUNT || Object.keys(rule).some(k => !['FREQ', 'COUNT', 'INTERVAL'].includes(k))) throw new Error('订阅包含暂不支持的重复规则。');
        count = Number(rule.COUNT); interval = Number(rule.INTERVAL || 1);
        if (!Number.isInteger(count) || count < 1 || count > 100 || !Number.isInteger(interval) || interval < 1 || interval > 100) throw new Error('重复规则超出限制。');
      }
      if (p.EXDATE || p.RDATE || p['RECURRENCE-ID'] || p.DURATION) throw new Error('订阅包含暂不支持的例外或时长规则。');
      const kind = p['X-APPLE-SPECIAL-DAY'] === 'WORK-HOLIDAY' ? 'holiday' : p['X-APPLE-SPECIAL-DAY'] === 'ALTERNATE-WORKDAY' ? 'workday' : 'event';
      events.push({ uid: p.UID || `${start}-${p.SUMMARY}`, title: text(p.SUMMARY), start, end, kind, count, interval });
      continue;
    }
    const colon = line.indexOf(':'); if (colon < 0) continue;
    const property = line.slice(0, colon).split(';')[0].toUpperCase(), value = line.slice(colon + 1);
    if (props) props[property] = value; else if (property === 'X-WR-CALNAME') name = text(value);
  }
  if (props || !events.length || events.length > 5000) throw new Error('日历没有有效事件或结构不完整。');
  return { name, events };
}
export function eventsOnDate(calendar: HolidayCalendar | null, date: string): HolidayEvent[] {
  if (!calendar || !valid(date)) return [];
  const result: HolidayEvent[] = []; const seen = new Set<string>();
  for (const event of calendar.events) {
    const duration = new Date(event.end + 'T00:00:00Z').getTime() - new Date(event.start + 'T00:00:00Z').getTime();
    for (let i = 0; i < event.count; i++) {
      const year = Number(event.start.slice(0, 4)) + i * event.interval;
      const start = `${year}${event.start.slice(4)}`; if (!valid(start)) continue;
      const end = new Date(new Date(start + 'T00:00:00Z').getTime() + duration).toISOString().slice(0, 10);
      const id = `${event.uid}-${start}`;
      if (date >= start && date < end && !seen.has(id)) { result.push(event); seen.add(id); }
    }
  }
  return result.sort((a, b) => ({ holiday: 0, workday: 1, event: 2 }[a.kind] - { holiday: 0, workday: 1, event: 2 }[b.kind]));
}
