# TalkBox Desktop

Tauri 2 + Vue 3 + TypeScript 跨平台桌面客户端，支持 Windows、macOS、Linux。

## 功能特性

- 用户注册/登录
- 用户列表（可直接发起私聊）
- 私聊和群聊
- 多种消息类型（文字、图片、视频、文件、卡片）
- @提及和引用回复
- WebSocket 实时消息
- Bot 创建和管理
- 文件拖放上传

## 项目结构

```
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.ts              # Vue 入口
│   ├── App.vue              # 根组件
│   ├── router.ts            # 路由配置
│   ├── style.css            # 全局样式
│   ├── api/
│   │   ├── http.ts          # Axios HTTP 客户端
│   │   ├── websocket.ts     # WebSocket 服务
│   │   └── types.ts         # TypeScript 类型定义
│   ├── stores/
│   │   ├── auth.ts          # 认证状态
│   │   ├── conversation.ts  # 会话状态
│   │   ├── message.ts       # 消息状态
│   │   ├── friend.ts        # 用户列表状态
│   │   └── bot.ts           # Bot 状态
│   ├── views/
│   │   ├── Login.vue        # 登录页
│   │   ├── Register.vue     # 注册页
│   │   ├── Home.vue         # 主页
│   │   ├── Settings.vue     # 设置页
│   │   └── BotList.vue      # Bot 管理页
│   └── components/
│       ├── ChatView.vue     # 聊天界面
│       └── MessageBubble.vue # 消息气泡
└── src-tauri/
    ├── Cargo.toml           # Rust 依赖
    ├── tauri.conf.json      # Tauri 配置
    └── src/main.rs          # Rust 入口
```

## 环境要求

- Node.js 18+
- Rust (rustup 安装)
- 系统依赖（见下方）

### macOS

```bash
xcode-select --install
```

### Ubuntu/Debian

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

### Windows

- Microsoft Visual Studio C++ Build Tools
- WebView2 (Windows 10/11 已内置)

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

构建产物位于 `src-tauri/target/release/bundle/`。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Tauri | 2.x | 跨平台桌面框架 |
| Vue | 3.4+ | 前端框架 |
| TypeScript | 5.3+ | 类型安全 |
| Vite | 5.x | 构建工具 |
| Pinia | 2.1+ | 状态管理 |
| Vue Router | 4.3+ | 路由管理 |
| Axios | 1.6+ | HTTP 客户端 |
| Iconify | 5.x | 图标库 |

## 窗口配置

- 默认尺寸: 1200 x 800
- 最小尺寸: 800 x 600
- 标题栏样式: Overlay (macOS 风格)
- 支持文件拖放

## 消息类型

| 类型 | 说明 |
|------|------|
| text | 文字消息，支持 @提及 |
| image | 图片消息，点击查看大图 |
| video | 视频消息，内置播放器 |
| file | 文件消息，点击下载 |
| card | 卡片消息（标题、内容、备注、链接） |

## License

MIT
