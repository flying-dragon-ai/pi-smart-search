# pi-smart-search

把本机 [smart-search](https://www.npmjs.com/package/@konbakuyomu/smart-search) CLI 包成 pi 工具。模型用 `pi_smart_search` 做带出处的检索；API key 留在 `~/.config/smart-search`，不进工具参数。

## 前提

本机已装 smart-search，且 `smart-search doctor` 能过。默认脚本：

`%APPDATA%\npm\node_modules\@konbakuyomu\smart-search\npm\bin\smart-search.js`

换路径：环境变量 `PI_SMART_SEARCH_BIN`。代理默认 `http://127.0.0.1:10808`，用 `PI_SMART_SEARCH_PROXY` 改。

## 安装

```bash
pi install D:/codingProjects/GITHUB/pi-smart-search
```

或发布后：

```bash
pi install npm:pi-smart-search
```

新会话生效。命令：`/smart-search`（跑 doctor）。

## 模型怎么用

对模型说：「用 pi_smart_search 查一下 XXX，并抓关键来源。」

| action | 干什么 |
|---|---|
| search | 网页检索 |
| zhipu | 中文/国内源 |
| fetch | 抓一个 URL |
| exa | 低噪声检索 |
| research | 多步研究 |
| context7-library / context7-docs | 库文档 |
| doctor / providers | 通道体检 |

工具返回压缩后的正文和来源 URL。全文落在项目 `.pi/smart-search/`。

## 私域搜索

`xhs` 只检索小红书笔记，`wechat` 只检索公众号文章。不发帖、不点赞、不关注。

### 小红书（已打通，基于本地 xiaohongshu-mcp）

登录与数据源都是本地服务，不需要任何平台 API key：

```bash
# 1. 起服务（幂等）：xiaohongshu-mcp(:18060) + xhs-adapter(:18061)
D:\codingProjects\GITHUB\smartsearch\start_xhs_adapter.cmd

# 2. 登录/重登：浏览器打开二维码页，用小红书 App 扫码
start http://127.0.0.1:18061/login

# 3. 配置（只写配置文件，密钥不进命令行）
smart-search config set XHS_API_URL http://127.0.0.1:18061
smart-search config set XHS_API_KEY local-xhs
smart-search config set XHS_MODE live

# 4. 搜索（真实结果）
smart-search xhs-search "露营装备" --format json
```


### 微信公众号

数据源未定。`WECHAT_API_URL` / `WECHAT_API_KEY` 配好后走同一个 `POST {baseUrl}/search` 适配器契约；未配置时返回 `error.code=auth_required`。`--fixture` 返回本地样例。`MODE=browser` 是实验项，当前返回 `upstream`。
未配置时返回 `error.code=auth_required`。本地验收用 CLI 的 `--fixture`。真源是 `POST {baseUrl}/search`，body 为 `{"query","count","platform"}`。`MODE=browser` 是实验项，当前返回 `upstream`。
