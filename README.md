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

密钥放 `~/.config/smart-search`，键名 `XHS_API_URL` / `XHS_API_KEY` / `WECHAT_API_URL` / `WECHAT_API_KEY`。不要写进工具参数。

未配置时返回 `error.code=auth_required`。本地验收用 CLI 的 `--fixture`。真源是 `POST {baseUrl}/search`，body 为 `{"query","count","platform"}`。`MODE=browser` 是实验项，当前返回 `upstream`。
