---
title: "用 Apple Container 在 Mac 上运行 n8n"
description: "使用 Apple 开源的 container 工具在 macOS 上部署 n8n 工作流自动化平台，涵盖基础运行、数据持久化和资源配置。"
date: 2026-07-06
category: "工具教程"
tags: ["container", "macos", "n8n", "automation"]
draft: true
---

## 目标

在 Apple Silicon Mac 上通过 Apple Container 运行 n8n，实现本地工作流自动化开发环境。完成后可通过浏览器访问 n8n 编辑器，工作流数据持久化到宿主机。

---

## 前置条件

- Apple Silicon Mac（M1/M2/M3/M4）
- macOS 26 或更高版本
- 已安装 Apple Container（参考 [Apple Container 介绍](/posts/apple-container-macos-linux-containers/)）
- container 系统服务已启动：`container system start`

---

## 操作步骤

### 1. 拉取 n8n 镜像

```bash
container pull docker.io/n8nio/n8n:latest
```

验证镜像已下载：

```bash
container image list
```

### 2. 基础运行

最简方式启动 n8n：

```bash
container run --name n8n --detach --memory 1g docker.io/n8nio/n8n:latest
```

查看容器 IP：

```bash
container list
```

输出中会显示容器的 IP 地址（如 `192.168.64.x`），在浏览器访问 `http://<容器IP>:5678` 即可打开 n8n 编辑器。

### 3. 使用本地 DNS 访问（macOS 26）

配置本地 DNS 后，可以用域名代替 IP 访问：

```bash
sudo container system dns create local
```

重新创建容器（如果之前已创建需要先停止）：

```bash
container stop n8n
container run --name n8n --detach --memory 1g docker.io/n8nio/n8n:latest
```

现在可以通过 `http://n8n.local:5678` 访问。

### 4. 数据持久化

n8n 默认将数据存储在容器内 `/home/node/.n8n` 目录，容器删除后数据丢失。通过目录挂载实现持久化：

```bash
mkdir -p ~/.n8n-data
```

```bash
container run --name n8n \
  --detach \
  --memory 1g \
  --mount "source=$HOME/.n8n-data,target=/home/node/.n8n" \
  docker.io/n8nio/n8n:latest
```

工作流、凭证、执行历史等数据保存在 `~/.n8n-data` 中，容器重建后不丢失。

### 5. 配置环境变量

通过环境变量自定义 n8n 行为：

```bash
container run --name n8n \
  --detach \
  --memory 1g \
  --mount "source=$HOME/.n8n-data,target=/home/node/.n8n" \
  --env N8N_PORT=5678 \
  --env GENERIC_TIMEZONE=Asia/Shanghai \
  --env N8N_SECURE_COOKIE=false \
  docker.io/n8nio/n8n:latest
```

常用环境变量：

| 变量 | 作用 | 默认值 |
|------|------|--------|
| `N8N_PORT` | 监听端口 | 5678 |
| `GENERIC_TIMEZONE` | 时区（影响 Cron 触发器） | UTC |
| `N8N_SECURE_COOKIE` | 是否要求 HTTPS cookie | true |
| `N8N_BASIC_AUTH_USER` | 基础认证用户名 | 无 |
| `N8N_BASIC_AUTH_PASSWORD` | 基础认证密码 | 无 |

### 6. 资源调优

n8n 执行复杂工作流时可能需要更多资源：

```bash
container run --name n8n \
  --detach \
  --cpus 2 \
  --memory 2g \
  --mount "source=$HOME/.n8n-data,target=/home/node/.n8n" \
  docker.io/n8nio/n8n:latest
```

也可以在全局配置文件 `~/.config/container/config.toml` 中设置默认值：

```toml
[container]
cpus = 2
memory = "2g"
```

---

## 结果验证

```bash
container list
```

确认 n8n 容器状态为 running，然后浏览器访问 `http://n8n.local:5678`（或容器 IP:5678），看到 n8n 的注册/登录页面即部署成功。

进入容器检查数据目录：

```bash
container exec n8n ls /home/node/.n8n
```

应看到 `database.sqlite`、`config` 等文件。

---

## 常见问题

**容器启动后无法访问 5678 端口**

Apple Container 的网络模型中，每个容器有独立 IP，不需要端口映射。确认使用的是容器 IP 而非 localhost。macOS 26 配置 DNS 后用 `n8n.local:5678` 访问。

**内存不足导致 n8n 崩溃**

n8n 在执行批量操作或大型工作流时内存消耗较大，建议至少分配 1g，复杂场景分配 2g。通过 `container stats n8n` 监控实际使用量。

**时区不正确导致 Cron 触发时间偏移**

启动时传入 `--env GENERIC_TIMEZONE=Asia/Shanghai`，或在 n8n 界面的 Settings > General 中设置。

---

## 参考资料

- [n8n Docker 部署文档](https://docs.n8n.io/hosting/installation/docker/)
- [Apple Container GitHub](https://github.com/apple/container)
- [Apple Container 介绍](/posts/apple-container-macos-linux-containers/)
