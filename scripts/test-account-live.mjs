// Read-only probes against the configured project. Never sends email or changes data.
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim()]; }));
const url = process.env.PUBLIC_SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Supabase public configuration missing');
let failures = 0;
async function probe(name, path, options, validate) {
  try {
    const response = await fetch(new URL(path, url), { ...options, headers: { apikey: key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    const ok = validate(response.status, data);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: HTTP ${response.status}`);
    if (!ok) { failures++; console.log(JSON.stringify({ code: data.code, message: data.message, error: data.error })); }
  } catch (error) { failures++; console.log(`FAIL ${name}: ${error.message}`); }
}
await probe('Auth settings reachable; email enabled and signup disabled', '/auth/v1/settings', {}, (status, data) => status === 200 && data.external?.email === true && data.disable_signup === true);
for (const table of ['site_admins', 'article_grants', 'bookmarks', 'reading_history', 'user_todos']) {
  await probe(`anonymous SELECT denied: ${table}`, `/rest/v1/${table}?select=*&limit=1`, {}, (status, data) => [401, 403].includes(status) && data.code === '42501');
}
await probe('anonymous articles include only published public rows', '/rest/v1/articles?select=visibility,status&limit=100', {}, (status, data) => status === 200 && Array.isArray(data) && data.every(row => row.visibility === 'public' && row.status === 'published'));
await probe('anonymous admin check RPC denied', '/rest/v1/rpc/is_site_admin', { method: 'POST', body: '{}' }, (status, data) => [401, 403].includes(status) && data.code === '42501');
// Nonexistent target IDs/email ensure the probe cannot create a real grant.
await probe('anonymous grant RPC denied', '/rest/v1/rpc/admin_grant_article', { method: 'POST', body: JSON.stringify({ article: '00000000-0000-0000-0000-000000000000', email: 'nobody@example.invalid' }) }, (status, data) => [401, 403].includes(status) && data.code === '42501');
console.log(failures ? `${failures} probe(s) failed; do not claim live acceptance.` : 'All 9 live read-only security probes passed. Authenticated ownership and email delivery require separate verification.');
process.exitCode = failures ? 1 : 0;
