---
title: "CloakBrowser：C++ 源码级反检测 Chromium，通过 30/30 检测测试"
description: "CloakBrowser 是一个开源的反检测自动化浏览器，26k stars。它不是配置修补或 JS 注入，而是在 C++ 源码级别修改了指纹的真实 Chromium 二进制，58 个补丁覆盖 Canvas、WebGL、Audio、字体、GPU、WebRTC、TLS 指纹等维度。Playwright/Puppeteer 的直接替代品。"
date: 2026-06-14
tags: ["cloakbrowser", "chromium", "anti-detection", "browser-automation", "playwright", "puppeteer"]
draft: false
---

## 简介

Playwright 和 Puppeteer 是主流的浏览器自动化工具，但它们有一个致命问题：容易被反 bot 系统检测。Cloudflare Turnstile、FingerprintJS、reCAPTCHA v3 等检测服务可以轻易识别自动化浏览器。

市面上的解决方案（undetected-chromedriver、Patchright 等）主要通过 JavaScript 注入或 CDP 协议层面的修补来隐藏自动化痕迹。但这有一个根本性的弱点：修改发生在运行时，TLS 指纹、Canvas/WebGL 指纹等底层特征仍然暴露。

CloakBrowser 的做法更激进——**在 C++ 源码级别修改 Chromium**，然后重新编译。这意味着反 bot 系统看到的不是一个"被修补的浏览器"，而是一个"指纹被修改的正常浏览器"。58 个 C++ 补丁覆盖 Canvas、WebGL、Audio、字体、GPU、屏幕、WebRTC、网络计时、自动化信号、CDP 输入行为等维度，通过 30/30 检测测试。

26k stars，它是 Playwright/Puppeteer 的**直接替代品（drop-in replacement）**，API 完全兼容，只需换一行 import。

## 项目概览

| 项目 | 值 |
|------|-----|
| 仓库 | [CloakHQ/CloakBrowser](https://github.com/CloakHQ/CloakBrowser) |
| Stars | 26k（截至 2026-06-14） |
| 许可证 | MIT（包装层）；Chromium 二进制为 BINARY-LICENSE |
| 语言 | Python（600KB）、TypeScript（486KB）、JavaScript（30KB）、Nix、Shell |
| 维护团队 | CloakHQ |
| 最新版本 | Chromium v146.0.7680.177.5 — Stealth Build（2026-05-21） |
| 创建时间 | 2026-02-22 |
| 官网 | [cloakbrowser.dev](https://cloakbrowser.dev/) |

## 核心功能

### 58 个 C++ 源码级补丁

覆盖维度：

| 检测维度 | 实现方式 |
|---------|---------|
| `navigator.webdriver` | 源码级补丁，返回 `false`（非 JS 覆写） |
| `navigator.plugins.length` | 返回真实插件列表（5 个），而非 0 |
| `window.chrome` | 存在且为 `object`，而非 `undefined` |
| User-Agent | `Chrome/146.0.0.0`，而非 `HeadlessChrome` |
| CDP 检测 | `isAutomatedWithCDP: false` |
| TLS 指纹 | ja3n/ja4/akamai 与真实 Chrome 完全一致 |
| Canvas/WebGL | 像素级噪声注入 |
| Audio Context | 音频指纹微调 |
| 字体枚举 | 返回真实字体列表 |
| WebRTC | IP 泄露防护 |
| 网络计时 | 消除自动化导致的时序异常 |
| CDP 输入行为 | 模拟真实输入事件特征 |

### `humanize=True` 一键人性化

模拟人类行为：

- **鼠标移动**：贝塞尔曲线生成自然轨迹，非直线移动
- **键盘输入**：模拟人类打字节奏，包含合理的按键间隔和误差
- **滚动**：非匀速滚动，模拟人类惯性

### 检测结果

| 检测服务 | 原版 Playwright | CloakBrowser |
|---------|----------------|--------------|
| reCAPTCHA v3 | 0.1（bot） | **0.9**（human） |
| Cloudflare Turnstile | FAIL | **PASS** |
| FingerprintJS | DETECTED | **PASS** |
| BrowserScan | DETECTED | **NORMAL** (4/4) |
| bot.incolumitas.com | 13 fails | **1 fail** |

### 自动更新二进制

后台检查更新，始终使用最新隐身构建。

### 零配置安装

`pip install` 或 `npm install`，首次运行自动下载 ~200MB 二进制并缓存。

### GeoIP 联动

自动根据代理 IP 匹配时区和 locale。

### Widevine/DRM 支持

构建时集成 Widevine，可通过侧加载 CDM 访问 DRM 内容。

## 快速上手

### 安装

#### Python

```bash
pip install cloakbrowser
# 可选 GeoIP 支持
pip install cloakbrowser[geoip]
```

#### JavaScript（Playwright / Puppeteer）

```bash
npm install cloakbrowser playwright-core
# 或
npm install cloakbrowser puppeteer-core
```

#### Docker 快速体验

```bash
# 运行检测
docker run --rm cloakhq/cloakbrowser cloaktest

# 启动 CDP 服务
docker run -d -p 127.0.0.1:9223:9223 cloakhq/cloakbrowser cloakserve
```

### 基本用法（Python）

```python
from cloakbrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
browser.close()
```

### 反检测配置

```python
browser = launch(
    proxy="http://user:pass@residential-proxy:port",
    geoip=True,       # 时区+locale 匹配代理 IP
    headless=False,    # 有头模式，更强反检测
    humanize=True,     # 人类行为模拟
)
page = browser.new_page()
page.goto("https://nowsecure.xyz")  # 反检测测试站点
```

### JavaScript 用法

```javascript
import { launch } from 'cloakbrowser';

const browser = await launch({
  proxy: 'http://user:pass@residential-proxy:port',
  geoip: true,
  headless: false,
  humanize: true,
});

const page = await browser.newPage();
await page.goto('https://nowsecure.xyz');
```

### 从 Playwright 迁移

只需换一行 import：

```python
# 原来
from playwright.sync_api import sync_playwright

# 改为
from cloakbrowser import launch
```

API 完全兼容，无需修改其他代码。

## 架构与原理

### 两层反检测架构

```plantuml
@startuml
skinparam backgroundColor white

rectangle "第一层：C++ 源码级补丁 (58 个)" as layer1 {
  [navigator.webdriver → false] as wd
  [TLS 指纹与真实 Chrome 一致] as tls
  [Canvas/WebGL 噪声注入] as canvas
  [Audio Context 微调] as audio
  [字体枚举返回真实列表] as font
  [WebRTC IP 泄露防护] as webrtc
  [CDP 检测隐藏] as cdp
  [User-Agent 伪装] as ua
  [网络计时修正] as timing
}

rectangle "Chromium C++ 源码" as chromium {
  [//chrome/browser/] as browser
  [//content/renderer/] as renderer
  [//net/socket/] as net
  [//third_party/blink/] as blink
}

rectangle "编译" as compile {
  [GN + Ninja] as build
  [生成修改后的 Chromium 二进制] as binary
}

rectangle "第二层：行为模拟 (humanize)" as layer2 {
  [贝塞尔曲线鼠标移动] as mouse
  [人类打字节奏] as keyboard
  [自然滚动模式] as scroll
}

rectangle "包装层 (Python/JS)" as wrapper {
  [Playwright API 兼容] as pw
  [Puppeteer API 兼容] as pp
  [CDP 协议封装] as cdpwrap
}

chromium --> layer1 : 打补丁
layer1 --> compile
compile --> binary

binary --> wrapper
layer2 --> wrapper

wrapper --> [CloakBrowser API] as api

@enduml
```

### C++ 源码级补丁的工作原理

以 `navigator.webdriver` 为例：

**传统方案（JS 注入）**：
```javascript
// 在页面加载后注入
Object.defineProperty(navigator, 'webdriver', { get: () => false });
```

问题：反 bot 系统可以在 JS 注入之前检测，或者检测 `Object.defineProperty` 的调用。

**CloakBrowser 方案（C++ 源码修改）**：
```cpp
// 修改 //content/renderer/renderer_blink_platform_impl.cc
bool RendererBlinkPlatformImpl::IsWebDriver() {
  return false;  // 硬编码返回 false
}
```

优势：修改发生在编译后的二进制中，JavaScript 层面的检测无法区分它与正常 Chrome——因为返回值是从 C++ 层直接输出的，不是运行时覆写的。

### TLS 指纹一致性

这是一个关键的技术点。很多反检测工具能绕过 JavaScript 检测，但 TLS 握手指纹（JA3/JA4）暴露非 Chrome 特征。

CloakBrowser 基于真实 Chromium 编译，TLS 指纹天然与 Chrome 一致：

- **JA3**：TLS 客户端握手的 MD5 哈希
- **JA4**：JA3 的改进版本
- **Akamai HTTP/2 指纹**：HTTP/2 SETTINGS 帧和优先级

这些指纹能过 Akamai、Cloudflare 等 TLS 指纹检测。

### 行为模拟（humanize）

`humanize=True` 启用后：

```python
# 鼠标移动
page.mouse.move(100, 200, steps=20)  # 贝塞尔曲线，非直线

# 键盘输入
page.keyboard.type("hello", delay=100)  # 模拟人类打字节奏

# 滚动
page.mouse.wheel(0, 300)  # 非匀速，模拟人类惯性
```

### 自动更新机制

CloakBrowser 后台检查更新，始终使用最新隐身构建：

```
1. 启动时检查 GitHub Releases
2. 如果有新版本，下载新的 Chromium 二进制
3. 验证 GPG 签名 + SHA-256 校验
4. 替换旧二进制
5. 下次启动使用新版本
```

### 安全发布

- GPG 签名
- GitHub binary attestation（Sigstore）
- Docker 镜像签名（Cosign）
- SHA-256 校验

## 关键设计决策

**1. 为什么在 C++ 源码级修改，而非 JS 注入？**

JS 注入的根本弱点是修改发生在运行时，可以被检测和绕过。C++ 源码修改发生在编译时，修改被嵌入二进制，JavaScript 层面的检测无法发现。

**2. 为什么是 Playwright/Puppeteer 的直接替代品？**

降低迁移成本。用户不需要学习新 API，只需换一行 import。

**3. 为什么 macOS 只有 26 个补丁？**

macOS 的 Chromium 编译更复杂，且部分检测维度（如 TLS 指纹）在 macOS 上的实现与 Linux/Windows 不同。团队在持续改进 macOS 支持。

**4. 为什么 Chromium 二进制是 BINARY-LICENSE？**

Chromium 本身是 BSD 许可证，但 CloakBrowser 的补丁代码是 MIT。二进制采用 BINARY-LICENSE 是为了防止再分发（用户可以免费使用，但不能重新打包分发）。

**5. 为什么需要 GeoIP 联动？**

如果你的代理 IP 在美国，但浏览器的时区是亚洲/上海，locale 是 zh-CN，这会被反 bot 系统识别为可疑。GeoIP 自动匹配时区和 locale，消除这种不一致。

**6. 为什么支持 Widevine/DRM？**

某些网站（如 Netflix、Spotify）需要 Widevine DRM 才能播放内容。CloakBrowser 构建时集成 Widevine，支持这些网站。

## 适用场景与局限

### 适用场景

- **网页爬虫**：绕过反 bot 检测，抓取受保护的网站
- **自动化测试**：在 Cloudflare Turnstile 等保护下进行 E2E 测试
- **价格监控**：监控电商网站的价格变化
- **社交媒体自动化**：自动化操作受保护的社交平台
- **CAPTCHA 求解辅助**：配合 2Captcha/CapSolver 使用
- **多账号管理**：配合 CloakBrowser-Manager 管理多个浏览器配置文件

### 局限

- **二进制不可再分发**：BINARY-LICENSE 限制
- **macOS 补丁较少**：只有 26 个（vs Linux/Windows 的 58 个）
- **项目仅 4 个月大**：维护者高度集中，长期稳定性待观察
- **122 个 open issues**：可能存在积压
- **需要下载 ~200MB 二进制**：首次使用需要等待下载
- **法律风险**：某些网站的服务条款可能禁止自动化访问

### 配套项目

- **CloakBrowser-Manager**（691 stars）：Web 端浏览器配置文件管理器，可创建、启动、管理具有唯一指纹的隔离浏览器配置文件。定位为 Multilogin / GoLogin / AdsPower 的免费自托管替代品。

## 参考资料

- 官方仓库：[CloakHQ/CloakBrowser](https://github.com/CloakHQ/CloakBrowser)
- 官网：[cloakbrowser.dev](https://cloakbrowser.dev/)
- CloakBrowser-Manager：[CloakHQ/CloakBrowser-Manager](https://github.com/CloakHQ/CloakBrowser-Manager)
- Playwright：[playwright.dev](https://playwright.dev/)
- Puppeteer：[pptr.dev](https://pptr.dev/)
