# 云端文章融入博客 Implementation Plan

**Goal:** 首页混排静态与云端文章，登录可见文章的全部字段仅向已登录且获授权用户返回，阅读页采用博客布局。

**Architecture:** 保持 Astro 静态输出；浏览器使用公开 key / 用户会话查询 Supabase，RLS 控制行可见性。首页只读取元数据，正文按需查询。新增 `/posts/read/?id=UUID` 静态外壳，旧阅读链接继续兼容。

**Constraints:** 不在构建阶段拉取云端内容；不放宽历史 restricted 权限；默认 authenticated；public 仅 published 可匿名读；草稿仅管理员读。不修改部署配置，不直接运行生产迁移。

## 验证记录

代码实现完成。模拟会话集成 17 项通过；未配置模式 8 项通过；本地 PostgreSQL 16 原权限矩阵及新可见范围矩阵通过；pnpm build 通过（221 页）；生产预览非法 ID 检查无脚本异常。pnpm check 仍被既有开发编辑页模板错误阻断。未应用线上迁移，未提交或部署。

以下为执行任务清单（详细结果以上方验证记录为准）。

## Tasks
- [ ] 新增权限回归脚本：anon/authenticated/admin 的 public/authenticated/restricted/draft 行级隔离；先在一次性 PostgreSQL 上验证旧结构失败，再应用增量迁移验证通过。
- [ ] 新增浏览器回归：匿名首页仅 public、已登录首页混排且无草稿、退出清空、公开正文匿名可读、登录正文无会话不泄露、默认 authenticated 和 public 编辑选项。
- [ ] 增量迁移扩展 articles.visibility，保留 restricted，新增 SELECT public 策略和排序索引。匿名不具备任何写权限及管理 RPC 权限。
- [ ] 首页元数据运行时加载并按 created_at 与静态文章混排。会话变化先清空旧数据，竞态以 generation 隔离；失败不影响静态文章。
- [ ] 共享云端阅读组件：真实 h1、日期、阅读时间、目录、安全 Markdown、收藏与历史；会话变化清空正文；新旧路由兼容。
- [ ] 管理器默认登录可见，公开为第二项，历史 restricted 仅编辑原文章时保留选项。正文、可见范围和草稿状态说明保持一致。
- [ ] 更新模拟测试、真实匿名探测脚本和部署文档，明确增量迁移应用步骤。
- [ ] 运行 SQL 权限矩阵、浏览器集成测试、pnpm build，核对构建产物无云端正文。
