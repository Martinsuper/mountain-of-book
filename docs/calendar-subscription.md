# Apple 中国大陆节假日订阅

待办页支持 `webcal://p10-calendars.icloud.com/holiday/CN_zh.ics`，标准化为 HTTPS。此功能读取外部 ICS，不内置节假日数据，也不修改待办存储。

## 部署固定来源代理

博客仍部署在 GitHub Pages；另行在自己的 Cloudflare 账号部署 Worker：

```bash
pnpm dlx wrangler login
pnpm dlx wrangler deploy --config workers/calendar-proxy/wrangler.toml
```

Worker 接口：`https://<你的 Worker 域名>/api/calendar/apple-cn`。只下载上述固定来源，不接受目标 URL，不支持私密日历。生产上线前删除不需要的本地开发 Origin。

通过构建环境变量设置完整接口地址：

```bash
PUBLIC_CALENDAR_PROXY_URL="https://<你的 Worker 域名>/api/calendar/apple-cn" pnpm build
```

本地开发可将变量写入 `.env.local` 后重启开发服务。生产构建需要同样的环境变量；当前没有修改 GitHub Actions 配置，请部署时显式向构建步骤提供该变量。接口地址不是密钥，可公开。没有配置时页面明确提示，不会假装订阅成功。

## 运行策略

- 配置及原始 ICS 缓存使用独立 localStorage 键，待办数据不迁移。
- 打开页面先显示缓存；超过一小时检查更新。回到标签页时检查；前台每小时检查，后台不轮询。
- 手动更新发送 `?refresh=1`，代理重新验证上游。60 秒内重复请求可返回已有缓存。
- 代理支持上游 ETag 条件请求，304 保留内容并更新检查时间。
- 代理保留成功内容最多七天用于重新验证，正常新鲜期一小时。Cloudflare Cache API 不保证永久保存，也不是全局一致缓存。
- 超时、网络或解析失败不覆盖成功缓存。前端显示失败状态与缓存保留提示。
- 更新无需重新部署 Pages，但初次设置或修改代理地址需要重新构建。并非秒级推送，来源自身的缓存不受项目控制。

## 展示与支持范围

来源： https://p10-calendars.icloud.com/holiday/CN_zh.ics

支持全天事件、跨日事件、来源当前使用的 `YEARLY;COUNT` 重复规则及可选 INTERVAL。DTEND 是排他结束日。取消事件忽略。非全天事件、复杂 RRULE、EXDATE/RDATE/RECURRENCE-ID/DURATION 明确报错，保留旧缓存，不冒充通用 ICS 客户端。

`WORK-HOLIDAY` 显示「休」，`ALTERNATE-WORKDAY` 显示「班」，普通节日和节气显示订阅标记。未来有节日不意味着已有放假安排；没有推算休假。点击日期查看事件，通过独立按钮新增当天任务。订阅事件不计入待办统计。

## 安全边界

固定 HTTPS 来源，无任意地址代理，无重定向；上游读取十秒超时、一 MiB 大小上限。不携带用户凭据、不记录完整订阅地址。CORS 允许列表仅控制浏览器访问，不构成鉴权。强制更新冷却是每个 Cloudflare 节点上的尽力保护，不是严格全局限流；公开上线应根据访问量配置 Cloudflare 限流或其他防滥用规则。
