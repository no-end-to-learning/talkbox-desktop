# TalkBox Desktop

Tauri 2 + Vue 3 + TypeScript 实现的跨平台桌面客户端，支持 Windows、macOS、Linux。

## 功能特性

- 用户注册/登录
- 好友管理
- 私聊和群聊
- 多种消息类型（文字、图片、视频、文件、卡片）
- @提及和引用回复
- 消息搜索
- WebSocket 实时消息
- Bot 管理
- 文件上传下载

## 项目结构

```
desktop/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.ts              # 入口
│   ├── App.vue
│   ├── router.ts            # 路由
│   ├── style.css            # 全局样式
│   ├── api/
│   │   ├── http.ts          # HTTP 客户端
│   │   ├── websocket.ts     # WebSocket
│   │   └── types.ts         # 类型定义
│   ├── stores/
│   │   ├── auth.ts          # 认证状态
│   │   ├── conversation.ts  # 会话状态
│   │   ├── message.ts       # 消息状态
│   │   ├── friend.ts        # 好友状态
│   │   └── bot.ts           # Bot 状态
│   ├── views/
│   │   ├── Login.vue        # 登录
│   │   ├── Register.vue     # 注册
│   │   ├── Home.vue         # 主页
│   │   ├── Settings.vue     # 设置
│   │   └── BotList.vue      # Bot 管理
│   └── components/
│       ├── ChatView.vue     # 聊天界面
│       └── MessageBubble.vue # 消息气泡
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/main.rs
```

## 环境要求

- Node.js 18+
- Rust (用于 Tauri)
- 系统依赖（根据平台）

### macOS
```bash
xcode-select --install
```

### Ubuntu/Debian
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### Windows
- Microsoft Visual Studio C++ Build Tools
- WebView2

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置服务端地址

创建 `.env` 文件：
```
VITE_API_URL=http://localhost:8080
```

### 3. 开发模式

```bash
npm run tauri dev
```

### 4. 构建发布

```bash
npm run tauri build
```

构建产物在 `src-tauri/target/release/bundle/` 目录。

## 技术栈

| 技术 | 说明 |
|------|------|
| Tauri 2 | 跨平台框架 |
| Vue 3 | 前端框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Pinia | 状态管理 |
| Vue Router | 路由 |
| Axios | HTTP 客户端 |

## 页面说明

### 登录/注册
- 支持用户名密码登录
- 新用户注册

### 主页
- 左侧：会话列表 / 好友列表
- 右侧：聊天界面
- 支持创建群聊

### 聊天
- 消息列表（支持上拉加载更多）
- 发送文字消息
- 发送文件（图片、视频、文件）
- 引用回复
- 消息搜索

### 设置
- 修改昵称
- Bot 管理入口
- 退出登录

### Bot 管理
- 创建 Bot
- 查看/复制 Token
- 删除 Bot

## 消息类型

### 文字消息
普通文本，支持 URL 自动识别和 @提及。

### 图片消息
显示图片预览，点击查看大图。

### 视频消息
显示视频播放器。

### 文件消息
显示文件名和大小，点击下载。

### 卡片消息
显示带颜色边框的卡片，包含标题、内容、备注，支持点击跳转。

## 开发说明

### 目录规范
- `api/` - API 相关（HTTP、WebSocket、类型）
- `stores/` - Pinia 状态管理
- `views/` - 页面组件
- `components/` - 通用组件
- `utils/` - 工具函数

### 状态管理
使用 Pinia 管理全局状态：
- `authStore` - 用户认证
- `conversationStore` - 会话列表
- `messageStore` - 消息
- `friendStore` - 好友
- `botStore` - Bot

### WebSocket
自动连接和重连，监听新消息和 @提及。

## 构建配置

### Tauri 配置
`src-tauri/tauri.conf.json`:
- 窗口大小：1200x800
- 最小尺寸：800x600
- 应用名称：TalkBox

### Vite 配置
- 开发端口：1420
- 路径别名：`@` -> `src/`

## Git Commit 规范

### 格式要求

- 使用英文
- 第一行为简短标题（50 字符以内），概括改动内容
- 如有详细说明，空一行后使用列表形式描述
- 不要添加 AI 生成签名（如 `Generated with Claude Code`、`Co-Authored-By` 等）

## License

MIT
