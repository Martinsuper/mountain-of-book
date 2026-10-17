import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim();

// Only the public anon/publishable key belongs in the static bundle. RLS is mandatory.
export const supabase = url && key ? createClient(url, key, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
}) : null;

export const configurationMessage = '账号服务尚未配置。请按部署说明设置 Supabase 公开环境变量并重新构建站点。';
