# 账号与私有文章部署

本站保持 Astro 静态输出，GitHub Pages 仅提供页面和脚本。Supabase 在运行时负责认证、个人数据和受限文章。本文是操作说明，不表示生产 Supabase、邮件或 GitHub 构建环境已配置完成。

## 1. 创建 Supabase 项目并应用数据库迁移

1. 创建独立 Supabase 项目，保存数据库密码到密码管理器，不写入仓库。
2. 在 SQL Editor 中，以项目数据库管理员按顺序运行 [基础迁移](../supabase/migrations/20260719000100_account_and_private_articles.sql)、[公开文章增量迁移](../supabase/migrations/20260719000200_public_article_visibility.sql) 和 [待办四象限同步迁移](../supabase/migrations/20261017000100_user_todos_quadrant_sync.sql)；已运行基础迁移的项目按顺序补齐后续两份，不能重复建表。或者使用已安装的 Supabase CLI，把项目链接到正确的 staging / production 后运行 `supabase db push`。不要把测试辅助文件当作迁移运行。
3. 确认 6 张表均开启 RLS：`site_admins`、`articles`、`article_grants`、`bookmarks`、`reading_history`、`user_todos`。
4. 在 Project Settings → API / API Keys 中取得项目 URL 与 **anon key 或 publishable key**。不同控制台版本入口名称可能略有不同。公开这两个值是正常设计；它们不是管理密钥。

迁移应由数据库 owner 创建函数，使 `is_site_admin()` 能在不递归触发 RLS 的情况下查询管理员表。不要将这些 SECURITY DEFINER 函数的 owner 改为浏览器角色。函数固定空 `search_path`，全部关系显式带 schema；RPC 只向 `authenticated` 授予 EXECUTE，`anon` 和 `PUBLIC` 均无调用权限。

### 权限边界

| 对象 | 未登录 | 普通登录用户 | 站点管理员 |
| --- | --- | --- | --- |
| `site_admins` | 无权限 | 仅查看自己的成员记录，不能修改 | 同样仅查看自己，不能通过客户端增删管理员 |
| `articles` | 仅已发布且 `visibility = public` | 已发布公开或登录可见文章，以及已发布且有自己授权的历史文章 | 增删改查全部文章，包括草稿 |
| `article_grants` | 无权限 | 仅查看自己的授权，不能修改 | 管理全部文章授权 |
| 书签、历史、待办 | 无权限 | 只能增删改查自己的记录 | 仍只能操作自己的记录 |

`articles.body` 是 Markdown 原文。`status = draft` 即使存在授权也不会向普通用户开放；授权撤销后后续查询立即不再返回文章。`updated_at` 由触发器维护。管理员资格只来自数据库中的 `site_admins`，绝不来自可由用户修改的 `user_metadata`。

**静态内容仍然公开**：现有仓库 Markdown、生成的 HTML、搜索索引、RSS、sitemap 和构建产物不受 Supabase RLS 保护。不要把私有正文、摘要或附件提交到公开 Git 仓库，或在 Astro 构建时读取并输出到 `dist`。登录可见及指定账号正文必须在登录后用用户会话从 Supabase 查询。公开云端正文允许匿名运行时查询，但仍不在构建时读取。

## 2. 关闭注册，配置回调，再邀请用户

在 Authentication 设置中：

1. 关闭 **Allow new users to sign up / Enable signups**，禁用不需要的匿名登录与第三方注册入口。本站不开放前端注册。
2. Site URL 设置为 `https://fblog.younote.top`。
3. Redirect URLs 精确允许 `https://fblog.younote.top/account/` 和密码重置回调 `https://fblog.younote.top/account/?reset=1`。本地开发按实际端口添加 `http://localhost:4321/account/`；如果使用 4322 测试，再单独添加对应地址。不要给生产回调配置宽泛通配符或不受控域名。若实际以仓库子路径部署，必须把子路径加入回调 URL。
4. 配置邮件发送渠道；生产使用自己的 SMTP，并检查发信域名与配额。Supabase 默认邮件服务通常有收件人/速率限制，不能假定可直接用于真实邀请。
5. 在 Authentication → Users → **Invite user** 输入邮箱，通过 Supabase Dashboard 邀请。检查邀请邮件最终回到允许的 `/account/`。控制台若提供 redirect 选项，选择该回调；若默认落到站点根路径，需按当前 Supabase 邮件模板说明把邀请确认链接的回调目标设为上述允许地址，并实际测试，不要假定配置 allowlist 会自动改变模板中的默认链接。
6. `/account/` 默认提供邮箱密码登录，不调用 signUp，不开放注册。已有邀请用户若尚未设置密码，首次可使用“发送登录邮件”登录，然后在个人中心“设置或修改密码”填写新密码和确认密码。以后可直接用邮箱密码登录；会话持久化并自动刷新，不需每次收邮件。
7. “忘记密码”向邮箱发送恢复链接，回调 `/account/?reset=1`，用户在原浏览器打开后设置新密码。Supabase 项目需要允许该精确回调地址（本地开发端口也要分别配置），检查 Reset Password 邮件模板使用官方确认链接。前端使用 PKCE，发送邮件和打开链接应在同一浏览器。普通 `?reset=1` 不代表身份验证：更新密码仍必须有 Supabase 验证后的有效用户会话。
8. 前端设置密码至少 8 位，最终强度、重用限制、重新认证和邮件配额由 Supabase Auth 设置决定。建议后台也配置至少 8 位的密码策略。测试环境需真实验收邀请→首次设置密码→退出→密码登录→忘记密码→邮件回调→更新密码全过程。密码不会写入本地存储或日志；浏览器只向 Supabase Auth HTTPS 接口提交。
9. 通行密钥登录：在 Authentication → Passkeys 中启用 **Enable Passkey authentication**，并配置 WebAuthn 依赖方信息：Relying Party Display Name（如“书山有路”）、Relying Party ID 填裸域名 `fblog.younote.top`、Relying Party Origins 填 `https://fblog.younote.top`，本地开发再加 `http://localhost:4321`（及实际测试端口，最多 5 个）。注意：通行密钥与 RP ID 绑定，启用后不要再更改该域名，否则所有已注册通行密钥失效。通行密钥凭据由 Supabase Auth 服务器存储，本仓库迁移无需建表。邀请制不变：用户仍须先经邀请并登录一次（邮箱密码或邮件链接），再到个人中心“账号设置 → 通行密钥”添加通行密钥，之后可在 iPhone、Mac 等设备上通过面容 ID / 触控 ID 直接登录。前端在浏览器不支持 WebAuthn 时自动隐藏通行密钥入口。

邀请属于管理操作，仅在 Dashboard（或将来经过审计的受信服务）完成。前端不能携带 `service_role`、`sb_secret_*` 或数据库凭据，也不应直接调用 Auth admin API。关闭公开注册不妨碍管理员邀请用户。

### 初始化首位管理员

先在 Dashboard 邀请并确认管理员账号存在，再在 SQL Editor 运行下列语句，把示例邮箱改为真实管理员邮箱：

```sql
insert into public.site_admins(user_id)
select id from auth.users where lower(email) = lower('admin@example.com')
on conflict (user_id) do nothing;

-- 必须确认返回的是预期账号；0 行说明邮箱不匹配，不能继续假定成功。
select u.id, u.email
from public.site_admins s join auth.users u on u.id = s.user_id;
```

后续增加或撤销管理员也只能通过受信 SQL 管理操作；客户端没有 `site_admins` 写权限。不要把 JWT metadata 中的 `admin: true` 当作授权依据。

### 按邮箱授权文章

管理员登录后的浏览器客户端可调用：

```typescript
const { error } = await supabase.rpc('admin_grant_article', {
  article: articleId,
  email: invitedEmail,
});
```

RPC 先检查数据库管理员资格，然后仅在服务器内部按忽略大小写的邮箱查找 `auth.users`，插入授权；重复调用不重复插入。目标账号必须先经 Dashboard 邀请存在。普通用户调用返回权限错误；匿名用户没有 EXECUTE 权限。接口不提供用户列表，也不把目标用户的邮箱或完整账号资料返回给客户端。撤销授权由管理员删除对应 `article_grants` 行完成。

### 页面入口与内容限制

- `/account/`：邮箱密码登录、备用邮件登录、忘记密码、通行密钥登录及退出。启用通行密钥后，登录卡片会显示“使用通行密钥登录”；个人中心“账号设置”内可为已登录账号添加、重命名、删除通行密钥。“账号设置”和“我的待办”默认收起，密码恢复回调会自动展开设置并聚焦新密码。加载及失败时仍提示状态。“我的待办”是四象限待办的快捷入口，与 `/todo/` 共用 `user_todos` 表；完整设计见 [待办云端同步](design/todo-cloud-sync.md)。收藏与阅读记录入口及前端读写已移除；数据库中原有 bookmarks、reading_history 表和历史数据保留，不自动删除。
- `/todo/`：四象限待办清单。登录账号后数据以数据库为权威存储，浏览器 localStorage 仅作镜像（离线可用）；未登录时保持纯本地模式并提示登录。首次登录且云端为空时提供把本地历史数据一键导入数据库的入口。
- `/members/`：旧列表页已移除，跳转首页；账号导航仅保留个人中心和文章管理。文章统一在首页按权限展示。
- `/`：现有 Markdown 与云端已发布文章按日期混排，运行时仅查询标题、日期、可见范围，不拉取正文。游客仅看到公开文章；登录用户还看到登录可见及获授权的历史文章。草稿不会进入首页。
- `/posts/read/?id=<article UUID>`：云端文章阅读页，使用博客标题、日期、阅读时间、目录与正文排版；数据库 RLS 决定是否返回整行。
- `/members/read/?id=<article UUID>`：兼容历史链接，使用同一阅读组件。
- `/account/admin/`：管理员先进入列表，可按全部/草稿/已发布筛选、搜索，再进入独立编辑视图。新建默认“登录可见”，另一项为“公开”；保存草稿与发布分别操作，已发布文章使用“保存修改”。更多操作提供取消发布与确认删除。公开发布需确认；离开未保存编辑需确认。历史 `restricted` 保留原选项和可折叠授权管理，不自动迁移为公开或登录可见。仅管理 Supabase 在线文章，不编辑仓库 Markdown。浏览器隐藏管理入口不是安全边界，数据库依然逐次检查权限。

公开内容集合的 schema 只接受 `visibility: public`（未填写时按公开内容处理），拒绝其他 visibility，避免把“私有” frontmatter 误当成静态站点访问控制。私有文章应存入 Supabase，不要放进公开 Markdown 集合。

私有 Markdown 渲染采用允许列表清洗 HTML，不允许图片、远程图表或嵌入内容，避免通过第三方资源请求泄漏阅读行为；它不复用公开文章的全部富文本功能。目前私有正文也不提供代码语法高亮。

书签和阅读历史保存的是各用户自己的文章路径与标题快照。站点前端已移除阅读记录功能，不再读写 `reading_history`；数据库表与既有数据保留，不自动删除。授权被撤销后，后续正文查询不再返回内容。若标题本身也有保密要求，应在撤销流程中另行考虑快照清理策略，不能假定文章 RLS 会自动删除个人记录。

## 3. 本地公共环境变量

从 [.env.example](../.env.example) 复制到未跟踪的 `.env.local`，填入同一个项目的 URL 和公开 API key：

```dotenv
PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

```bash
pnpm install
pnpm dev
```

变量名称中的 `ANON_KEY` 兼容 Supabase 的 legacy anon key 与新的 publishable key。它们都只能按公开权限和用户会话访问数据。绝不要使用 service-role / secret key 来“解决”RLS 错误。

## 4. GitHub Pages 构建注入

Astro 的 `PUBLIC_*` 变量在 **构建时**嵌入脚本。GitHub Pages 没有运行时环境变量；只改仓库变量而不重新构建不会更新部署。

[部署工作流](../.github/workflows/deploy.yml) 的 Build 步骤已注入日历代理地址与 Supabase 变量（取自仓库 Secrets）。要启用生产账号功能，维护者完成以下操作：

1. Repository Settings → Secrets and variables → Actions → **Secrets**，创建 `PUBLIC_SUPABASE_URL` 和 `PUBLIC_SUPABASE_ANON_KEY`。公开这两个值是正常设计（anon key 只随 RLS 生效），以 Secrets 储存仅为配置习惯；显示在前端产物中不代表泄漏。
2. 重新运行部署（后续 push 到 main 或手动 Dispatch 均会生效），并在生产 `/account/`、`/todo/` 验证真实登录、同步与退出。缺少配置时账号功能不可用不代表生产已接通。

不要在工作流、前端环境或构建日志中放入数据库 URL/密码、SMTP 密钥或管理 key。迁移和邀请都不需要在 Pages 构建任务里执行。

## 5. 执行数据库权限测试

[权限测试](../supabase/tests/permissions.sql) 是可直接运行的 psql 脚本，所有数据操作包在事务中，成功时 `ROLLBACK`。需要 **独立 staging / disposable Supabase 数据库**与两个已存在的 Authentication 用户。不要在生产运行测试；失败后连接退出也会回滚，但测试期间会暂时修改两名用户的管理员记录并获取数据锁。

1. 应用迁移，在 Dashboard 创建/邀请两个专用测试账号。
2. 从 Supabase Connect 取得直连或 session pooler 数据库连接信息，使用数据库 owner `postgres` 连接。用交互式密码输入或本机密码管理器；不要把实际密码写进本文或 shell 历史。
3. 执行（示例环境变量中的连接串不应包含明文密码；psql 可交互询问密码）：

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -v admin_email='admin-test@example.com' \
  -v reader_email='reader-test@example.com' \
  -f supabase/tests/permissions.sql
```

通过标准：进程退出码 0，最后输出 `PASS: RLS, RPC permissions, metadata spoofing and ownership checks (rolled back).`。任何断言失败都应阻止上线。

脚本以 `SET LOCAL ROLE authenticated/anon` 与事务内 `request.jwt.claims` 轮流模拟两名用户，验证管理员/普通用户/匿名用户、授权与草稿、撤销授权、RPC、伪造 `user_metadata`、个人数据的跨用户 SELECT/INSERT/UPDATE/DELETE，以及修改 `user_id` 的 WITH CHECK。只有受信数据库连接可以这样模拟；浏览器用户不能自行替换 Supabase 验证后的 JWT claims。该测试不是 Auth 邮件或浏览器登录的端到端测试，仍需真实会话验证。

### 无 Supabase CLI 的本地 SQL 快速检查

如已有 PostgreSQL 15+，可在**全新、一次性数据库**先执行 [本地 auth shim](../supabase/tests/local-auth-shim.sql)，再执行迁移和同一个权限测试：

```bash
createdb account_permissions_scratch
psql -d account_permissions_scratch -X -v ON_ERROR_STOP=1 \
  -f supabase/tests/local-auth-shim.sql \
  -f supabase/migrations/20260719000100_account_and_private_articles.sql \
  -f supabase/migrations/20260719000200_public_article_visibility.sql \
  -f supabase/migrations/20261017000100_user_todos_quadrant_sync.sql \
  -f supabase/tests/article-visibility.sql \
  -v admin_email='admin@example.test' -v reader_email='reader@example.test' \
  -f supabase/tests/permissions.sql
```

需要有创建 `anon` / `authenticated` 角色的权限；shim 不兼容已存在这些对象的数据库。它只提供最小 `auth.users` / `auth.uid()` 接口，用于验证 PostgreSQL ACL、函数和 RLS；**不得在真实 Supabase 项目执行 shim**，也不能以其结果代替 staging 上的真实 Supabase 测试。

### 浏览器回归测试

账号测试包含未配置时的安全降级，以及完全拦截后端 HTTP 的模拟登录、个人待办、文章管理、授权与 Markdown 消毒测试。两种模式使用独立端口，避免复用环境变量不同的开发服务器：

```bash
# 未配置模式：确保没有在 .env.local 中设置真实 Supabase 变量
PLAYWRIGHT_PORT=4334 pnpm test tests/account.spec.ts

# 模拟服务，无需真实凭据，不会访问云端账号
PUBLIC_SUPABASE_URL=https://account-test.supabase.co \
PUBLIC_SUPABASE_ANON_KEY=public-test-key \
PLAYWRIGHT_PORT=4333 pnpm test tests/account.spec.ts
```

如果没有 Playwright 浏览器，先运行 `pnpm exec playwright install chromium`，或通过 `PLAYWRIGHT_EXECUTABLE_PATH` 指定本机 Chrome 可执行文件。模拟 HTTP 测试不能代替真实 Supabase 上的 RLS 和邮件登录验收。

### 真实 Supabase 无登录检查

```bash
# 读取本地公开配置，只检查 Auth settings、匿名 SELECT 和管理 RPC 拒绝访问
pnpm test:account:live

# 浏览器使用真实项目配置，只验证游客页面；不发送邮件、不写入数据
# 显式传入与 .env.local 相同的 PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY
ACCOUNT_LIVE_TEST=1 PLAYWRIGHT_PORT=4342 pnpm test tests/account-live.spec.ts
```

匿名检查不验证站长身份、真实双账号 RLS 或邮件回调。后续可以在独立测试项目配置专用测试身份来完成全自动真实登录测试，不能用高权限 key 代替普通用户会话来证明数据隔离。

## 6. 上线验收与未实现边界

- 匿名请求仅可读取已发布的公开文章，不能返回登录可见文章的标题、日期、正文或其他字段，不能读取个人表或执行管理 RPC。
- **上线前必须应用第二份增量迁移**。本地代码更新不会自动更新 Supabase schema。迁移不改现有文章 visibility，新文章数据库默认值改为 authenticated。
- 普通用户只能读取已发布的登录可见文章与自己获授权的受限文章；有草稿授权也看不到草稿。
- 两个真实账号分别创建待办，验证彼此不可读取或改写；数据库中遗留的 bookmarks、reading_history 数据同样仅限本人访问。管理员也不能读取另一用户的个人数据。
- 启用通行密钥后，在 iPhone（Safari）上真实验收：已登录账号添加通行密钥 → 退出 → 通行密钥登录（面容 ID）→ 删除通行密钥后无法再用其登录；并确认未启用时登录页不出现通行密钥入口。
- 管理员可以编辑文章和授权；普通用户即使修改 metadata 或自行发起 REST 请求也不能提权。
- 检查 `dist`、搜索索引、RSS、sitemap、仓库与网络响应，不含未获授权的正文。
- **私有 Storage 未实现**：迁移未创建 bucket 或 `storage.objects` 策略，也未提供上传或签名下载 RPC。不要把附件上传到 public bucket 后称为“私有”；附件需另行设计并审计 bucket、对象路径、RLS 和短时签名 URL。
- 该方案不提供 DRM：已授权用户收到正文后仍可保存；撤销授权不能收回已下载内容。

## 参考资料

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Astro 环境变量](https://docs.astro.build/en/guides/environment-variables/)
