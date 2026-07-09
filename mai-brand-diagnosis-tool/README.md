# 麦一联盟 AI 品牌诊断系统

这是一个可在线部署的品牌诊断网页工具。客户输入品牌名/公司名、品牌年度预算、资料文本和已有渠道后，系统会实时检索公开网页来源，并结合 DeepSeek 生成品牌画像、声量诊断、行业竞品对标和可落地品宣方案。

## 当前能力

- 输入品牌名/公司名后自动检索公开信息。
- 尽量构建约 100 条来源池，用于品牌、行业和竞品分析。
- 将来源分为品牌精确来源、品牌疑似来源、行业/竞品发现、行业候选来源，避免把无关来源误写成品牌证据。
- 接入 DeepSeek API，输出更完整的行业判断、竞品筛选和策略建议。
- 支持阿里云 ECS、Render、Railway、Vercel Node 服务、Docker 等后端部署方式。

## 本地运行

```bash
npm start
```

默认访问：

```text
http://127.0.0.1:4173
```

## 环境变量

复制 `.env.example` 为 `.env`，并填写自己的 DeepSeek Key：

```bash
cp .env.example .env
```

必填：

```text
DEEPSEEK_API_KEY=sk-xxxx
```

推荐保留：

```text
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
TARGET_SOURCE_COUNT=100
AI_SOURCE_COUNT=100
```

## 阿里云正式部署

正式域名：

```text
https://www.mineaibd.com
```

阿里云部署文件：

```text
deploy/
docker-compose.aliyun.yml
```

推荐方式是 ECS + Docker Compose + Caddy：

- Caddy 自动申请和续期 HTTPS 证书。
- AI品牌诊断系统运行在独立容器内。
- 后续官网、内容系统、AI品牌增长系统模块可以继续加到同一台服务器的反向代理中。

详细步骤见：

```text
deploy/ALIYUN_DEPLOY.md
```

中国内地 ECS 需要先做 ICP 备案；如果想先快速上线，可先选中国香港或海外地域。

## Render 在线部署

GitHub Pages 只能托管静态网页，不能安全运行搜索后端和 DeepSeek 密钥。本工具需要 Node.js 后端，所以推荐使用 Render。

1. 打开 Render，选择 `New Web Service`。
2. 连接 GitHub 仓库：`qiuyang668899-ux/opc-ability-test`。
3. Root Directory 填：`mai-brand-diagnosis-tool`。
4. Start Command 填：`npm start`。
5. Environment Variables 添加：

```text
DEEPSEEK_API_KEY=你的 DeepSeek Key
NODE_ENV=production
HOST=0.0.0.0
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
TARGET_SOURCE_COUNT=100
AI_SOURCE_COUNT=100
```

6. 点击部署，完成后 Render 会生成一个可分享访问的网址。

## 重要说明

真实 DeepSeek 密钥不要提交到 GitHub。本仓库只保留 `.env.example` 占位模板，线上服务在服务器环境变量中读取真实密钥。

如果线上页面提示搜索服务未启动，通常是后端没有部署成功、环境变量缺失，或部署平台没有把 Root Directory 设置为 `mai-brand-diagnosis-tool`。
