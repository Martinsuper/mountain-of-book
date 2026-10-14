import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260501\r\nSUMMARY:劳动节\r\nEND:VEVENT\r\nEND:VCALENDAR';
test('fixed source, cache, forced refresh ETag and errors', async () => {
  const entries = new Map(); globalThis.caches = { default: { match: async k => entries.get(k.url)?.clone(), put: async (k,v) => { entries.set(k.url,v.clone()); } } };
  let calls = 0, fail = false;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => { assert.equal(url, 'https://p10-calendars.icloud.com/holiday/CN_zh.ics'); assert.equal(options.redirect, 'manual'); calls++; if (fail) throw Error('offline'); return options.headers['If-None-Match'] ? new Response(null, {status:304}) : new Response(ics,{headers:{ETag:'"v1"'}}); };
  const pending=[]; const ctx={waitUntil:p=>pending.push(p)};
  const request=q=>new Request('https://proxy.example/api/calendar/apple-cn'+q,{headers:{Origin:'https://fblog.younote.top'}});
  try {
    let r=await worker.fetch(request(''),{},ctx); assert.equal(r.status,200); assert.equal(await r.text(),ics); await Promise.all(pending);
    r=await worker.fetch(request(''),{},ctx); assert.equal(r.status,200); assert.equal(calls,1);
    r=await worker.fetch(request('?refresh=1'),{},ctx); assert.equal(r.status,200); await Promise.all(pending); assert.equal(calls,2);
    assert.equal((await worker.fetch(request('?url=https://evil'),{},ctx)).status,400);
    assert.equal((await worker.fetch(new Request('https://proxy.example/api/calendar/apple-cn',{headers:{Origin:'https://evil.example'}}),{},ctx)).status,403);
    entries.delete('https://proxy.example/_cache/apple-cn-refresh'); fail=true;
    assert.equal((await worker.fetch(request('?refresh=1'),{},ctx)).status,502);
    assert.equal(await entries.get('https://proxy.example/_cache/apple-cn').clone().text(),ics);
  } finally { globalThis.fetch=oldFetch; }
});
