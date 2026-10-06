# OPC能力测试 - 人类操作系统

一个面向手机浏览器的陪伴成长教练网页应用，包含 AI 架构师教练、7 日启动序列、系统重置、心境音乐、视觉状态诊断、能量同步与日志训练。

## 功能

- AI 架构师：基于用户状态、目标和输入生成教练式反馈。
- 7 日启动序列：首次进入即可进入训练闭环。
- 心境音乐：内置 WAV 音频素材库，并提供实时合成兜底。
- 视觉诊断：在 HTTPS 环境下启用摄像头查看状态画面。
- 系统重置：呼吸、频率、文字与步骤化训练。
- 日志与能量同步：本地保存个人训练记录。

## 发布

本项目已配置 GitHub Pages 自动部署。推送到 `main` 分支后，GitHub Actions 会构建 `dist` 并发布为公开网页。

```bash
npm install
npm run build
```

## 教练连接与数据边界

GitHub Pages 只托管静态网页，不会运行 `worker/hos-worker.js`。没有配置服务端地址时，页面明确显示“本机陪伴模式”，不是已连接 DeepSeek。

云端启用需要单独部署 Worker（或兼容的服务端），将 `DEEPSEEK_API_KEY` 放在服务端密钥存储中，再将该服务的 `/api/hos-coach` HTTPS 地址设置为 GitHub 仓库变量 `VITE_HOS_AI_ENDPOINT` 并重新构建。默认使用 `deepseek-flash` 非思考模式，交互优先；可用服务端 `DEEPSEEK_MODEL` 覆盖。不要把密钥放进 `VITE_` 变量、网页代码、Git 或聊天记录。正式商业发布前还需在网关配置按用户认证与配额/限流，CORS 本身不是鉴权。

服务端 `GET /api/hos-coach` 只检查配置就绪，不发送用户日志，也不声称模型调用已验证。前端分析等待上限 12 秒；服务端上游等待 10 秒，失败保留本机结果，并允许主动取消等待。

语音由浏览器提供转写服务，HOS 不保存原始录音。普通表单语音作为可追溯碎片进入日志，但不修改当日状态；主动状态日记会生成可校准建议，不覆盖用户手动填写的状态。声学线索和分数不是医学/心理诊断。浏览器不支持转写或无法联网时，可就地使用键盘话筒或文字输入。

## 回归检查

```bash
node scripts/verify-practice-timer.mjs
node scripts/verify-qimen-practice.mjs
node scripts/verify-coach-quality.mjs
npm run build
```

接口参数参考 [DeepSeek 官方对话补全文档](https://api-docs.deepseek.com/api/create-chat-completion/)。
