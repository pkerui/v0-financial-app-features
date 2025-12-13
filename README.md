# Financial app features

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/pkerui-9386s-projects/v0-financial-app-features)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/rWTjBczZnEO)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/pkerui-9386s-projects/v0-financial-app-features](https://vercel.com/pkerui-9386s-projects/v0-financial-app-features)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/rWTjBczZnEO](https://v0.app/chat/rWTjBczZnEO)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

---

## 双端口开发环境 (Dual Port Development)

本项目支持双端口开发环境，用于同时测试网页版（Supabase）和桌面版（LeanCloud）功能。

### 开发服务器

| 模式 | 命令 | 端口 | 后端 | 用途 |
|------|------|------|------|------|
| 网页版 | `npm run dev` | 3000 | Supabase | 生产网页版开发 |
| 桌面版测试 | `npm run dev:desktop` | 3001 | LeanCloud | 桌面版功能测试 |

### 使用方法

```bash
# 网页版开发（Supabase 后端）
npm run dev
# 访问 http://localhost:3000

# 桌面版测试（LeanCloud 后端）
npm run dev:desktop
# 访问 http://localhost:3001
```

### 同时运行

两个开发服务器可以同时运行，互不干扰：

```bash
# 终端 1 - 网页版
npm run dev

# 终端 2 - 桌面版测试
npm run dev:desktop
```

### 配置文件

- `.env.local` - 网页版配置（Supabase + LeanCloud）
- `.env.leancloud` - 桌面版测试配置（强制 LeanCloud 模式）

### 重要提示

**在用户明确要求之前，不要执行 Electron 打包命令：**
- `npm run electron:build:mac`
- `npm run electron:build:win`
- `npm run electron:build:linux`

桌面版测试平台 (`npm run dev:desktop`) 的目的是避免每次代码改动都需要重新打包 Electron 应用。

---
