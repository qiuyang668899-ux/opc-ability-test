# 阿里云上线操作清单

目标域名：

- `www.mineaibd.com`
- `mineaibd.com`

## 推荐购买

如果想尽快上线，优先选择中国香港或海外地域。中国内地地域需要先做 ICP 备案，备案完成前域名不能直接解析到内地服务器提供网站访问。

建议服务器起步配置：

- ECS 经济型 e 或通用算力型 u1
- 2 核 4G
- Ubuntu 22.04 LTS 或 24.04 LTS
- 40G-80G ESSD 云盘
- 固定公网 IP
- 带宽 3M-5M 起步

后续如果同时承载官网、内容系统和多个 AI 产品模块，再升级到 4 核 8G。

## 安全组

放行端口：

- `22`：远程部署
- `80`：自动签发 HTTPS 证书
- `443`：正式 HTTPS 访问

## 域名解析

在阿里云云解析 DNS 中添加：

| 记录类型 | 主机记录 | 记录值 |
| --- | --- | --- |
| A | `@` | 服务器公网 IP |
| A | `www` | 服务器公网 IP |

## 首次部署

在服务器上执行一次初始化：

```bash
sudo bash deploy/server-setup-ubuntu.sh
```

在本机发布：

```bash
SERVER_HOST=服务器公网IP SSH_KEY=你的SSH密钥路径 bash deploy/publish-to-aliyun.sh
```

如果服务器没有 SSH 密钥，也可以临时使用密码登录：

```bash
SERVER_HOST=服务器公网IP bash deploy/publish-to-aliyun.sh
```

## 环境变量

服务器 `/opt/mai-brand-diagnosis-tool/.env` 必须填写：

```text
DEEPSEEK_API_KEY=你的DeepSeek密钥
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
TARGET_SOURCE_COUNT=100
AI_SOURCE_COUNT=100
NODE_ENV=production
HOST=0.0.0.0
```

## 启停命令

```bash
cd /opt/mai-brand-diagnosis-tool
docker compose -f docker-compose.aliyun.yml up -d --build
docker compose -f docker-compose.aliyun.yml logs -f
docker compose -f docker-compose.aliyun.yml down
```
