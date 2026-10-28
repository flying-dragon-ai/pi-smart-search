---
name: pi-smart-search
description: 用本机 smart-search CLI 做带出处的网页检索。当需要当前事实、官方文档、中文来源、抓取指定 URL、或核对渠道是否可用时使用。工具名 pi_smart_search。不要把 API key 写进参数。
---

# pi-smart-search

调用工具 `pi_smart_search`。密钥在 `~/.config/smart-search`，参数里不要出现 key。

## 选 action

| 需求 | action | 必填 |
|---|---|---|
| 普通网页事实 | `search` | query |
| 中文、国内政策/新闻 | `zhipu` | query |
| 已有 URL，要页面正文 | `fetch` | url |
| 低噪声官方页/论文 | `exa` | query |
| 库/SDK/框架文档 | `context7-library` 再 `context7-docs` | query / libraryId+query |
| 多步交叉验证 | `research` | query |
| 只看会走哪条通道 | `route` | query |
| 通道挂了 | `doctor` 或 `providers` | 无 |
| 小红书笔记 | `xhs` | query |
| 小红书笔记 | `xhs` | query |
| 微信公众号文章 | `wechat` | query |
| 知乎问答 | `zhihu` | query |
| 微博 | `weibo` | query |
| 网盘分享链接 | `pan` | query |
| 磁力/电驴链接 | `magnet` | query |
| 电子书镜像目录 | `ebook` | query |
| 学术论文（OpenAlex+Semantic Scholar） | `academic` | query |
| B站视频 | `bilibili` | query |
高风险事实（新闻、政策、价格、健康）不要只信 search 的 content，对关键 URL 再 `fetch` 一次，只转述抓到的正文。

完整输出若被截断，按工具返回的 `full text` 路径用 read 读。
