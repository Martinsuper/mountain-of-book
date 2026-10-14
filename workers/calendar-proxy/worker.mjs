const SOURCE = 'https://p10-calendars.icloud.com/holiday/CN_zh.ics';
const LIMIT = 1024 * 1024;
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || 'https://fblog.younote.top,http://localhost:4321,http://localhost:4322').split(',').map(s => s.trim());
    const headers = { 'Vary': 'Origin', 'Cache-Control': 'no-store' };
    if (origin && !allowed.includes(origin)) return new Response('Origin not allowed', { status: 403 });
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    const reply = (body, status = 200, extra = {}) => new Response(body, { status, headers: { ...headers, ...extra } });
    const url = new URL(request.url);
    if (url.pathname !== '/api/calendar/apple-cn') return reply('Not found', 404);
    if (request.method === 'OPTIONS') return reply(null, 204);
    if (request.method !== 'GET') return reply('Method not allowed', 405);
    if ([...url.searchParams.keys()].some(k => k !== 'refresh') || (url.searchParams.has('refresh') && url.searchParams.get('refresh') !== '1')) return reply('Invalid parameters', 400);
    const force = url.searchParams.get('refresh') === '1';
    const cache = caches.default;
    const key = new Request(new URL('/_cache/apple-cn', url.origin));
    const cooldownKey = new Request(new URL('/_cache/apple-cn-refresh', url.origin));
    const cached = await cache.match(key);
    const fetchedAt = Number(cached?.headers.get('X-Fetched-At') || 0);
    const deliver = response => reply(response.body, 200, { 'Content-Type': 'text/calendar; charset=utf-8', 'X-Calendar-Checked-At': response.headers.get('X-Fetched-At') || '', 'Access-Control-Expose-Headers': 'X-Calendar-Checked-At' });
    if (!force && cached && Date.now() - fetchedAt < 3600000) return deliver(cached);
    if (force && await cache.match(cooldownKey)) return cached ? deliver(cached) : reply('Please retry later', 429, { 'Retry-After': '60' });
    // Best effort per-PoP cooldown, not a global abuse prevention gate.
    if (force) await cache.put(cooldownKey, new Response('1', { headers: { 'Cache-Control': 'public, max-age=60' } }));
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const etag = cached?.headers.get('ETag');
      const upstream = await fetch(SOURCE, { redirect: 'manual', signal: controller.signal, headers: etag ? { 'If-None-Match': etag } : {} });
      let body;
      if (upstream.status === 304 && cached) body = await cached.text();
      else {
        if (!upstream.ok || upstream.status !== 200) throw new Error('Upstream unavailable');
        if (Number(upstream.headers.get('Content-Length')) > LIMIT) throw new Error('Too large');
        const reader = upstream.body?.getReader(); if (!reader) throw new Error('Empty response');
        let length = 0; const chunks = [];
        while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > LIMIT) { await reader.cancel(); throw new Error('Too large'); } chunks.push(value); }
        const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        body = new TextDecoder().decode(bytes);
      }
      if (!body.includes('BEGIN:VCALENDAR') || !body.includes('END:VCALENDAR')) throw new Error('Invalid calendar');
      const next = new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'public, max-age=604800', 'X-Fetched-At': String(Date.now()), ...(upstream.headers.get('ETag') || etag ? { ETag: upstream.headers.get('ETag') || etag } : {}) } });
      ctx.waitUntil(cache.put(key, next.clone()));
      return deliver(next);
    } catch { return reply('Calendar update failed; keep your previous local cache.', 502); }
    finally { clearTimeout(timer); }
  }
};
