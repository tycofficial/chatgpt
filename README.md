# ChatGPT Web Workspace

参考 ChatGPT 布局独立实现的中文网页工作区，提供 Chat、Work 和 Codex 三种使用方式，以及实际可执行的浏览器 Python 环境。

**访问网站：<https://tycofficial.github.io/chatgpt/>**

本项目并非 OpenAI 官方产品，也没有原版 ChatGPT 的私有后端、系统提示词、账户服务或云计算容器。使用相同模型并不意味着输出、工具能力和原版完全相同。

## 可以做什么

- 流式 AI 对话，使用已核实的原版模型目录，停止生成、重试或编辑消息。
- Chat 用于日常交流；Work 强调完成任务和交付文件；Codex 强调软件实现与代码说明。三种模式使用各自的界面和指令，共享本项目实际提供的工具。
- Markdown、代码高亮、数学公式、代码复制与下载，HTML 文件隔离预览。
- AI 调用 Python、读取对话文件、创建文本文件；显示工具执行过程、输出、图表和可下载成果。
- 通过服务商原生联网搜索工具检索网页，并返回来源链接。可由 AI 自动调用，也可从工具菜单发起搜索。
- 上传文件、图片粘贴和拖放；资料库汇总生成文件，图像页展示对话中的图片。
- 本地聊天历史、搜索、重命名、置顶、归档、项目分类和项目指令。
- 浅色、深色及跟随系统的外观，自定义回复指令。
- JSON 数据导入导出、Markdown 对话导出、临时聊天。
- 浏览器语音识别与朗读；图片生成入口调用服务商的兼容接口。可用性取决于浏览器、权限和 API 服务商。

## 模型连接

连接采用 OpenAI 兼容 HTTP API：

- `GET /v1/models`
- `POST /v1/chat/completions`，支持 SSE 流式响应和函数工具调用
- `POST /v1/responses`，使用服务商支持的原生 `web_search` 工具检索网页
- `POST /v1/images/generations`，用于可选的图片生成

默认连接定义在 `config.js`。根据仓库所有者的明确要求，本项目将预置 API 连接及密钥放在公开静态站点中，使访客无需配置即可使用。该密钥对源码阅读者及浏览器请求查看者可见，API 费用和额度由该连接承担。README 不重复密钥内容。

Work/Codex 的模型目录位于 `model-catalog.js`，保留已核实的三个模型家族和六档预设。API 模型列表不会直接扩充菜单。新增模型需要同时核实 OpenAI 官方发布信息和 API 中匹配的模型标识，再检查推理及工具参数。第三方服务需允许跨域访问。本站没有单独的服务器 API 代理。

联网搜索使用真实 API 请求，并展示服务商返回的来源。默认连接已验证能够调用 `web_search`；更换服务商或模型后，是否支持由新连接决定。当前连接不支持服务商原生 `code_interpreter`，因此 Python 执行使用下述浏览器运行时。

## Python 与文件

Python 使用 **Pyodide / CPython WebAssembly**，在独立 Web Worker 内实际执行。首次运行从 jsDelivr 下载运行时，所需包按代码导入情况加载，需要网络连接。支持 NumPy、pandas、Matplotlib 等 Pyodide 兼容包，Matplotlib 图表可回传为图片。

文件工作目录是 `/mnt/data`。同一次运行会话可保留变量和文件；切换聊天、新建聊天、刷新网页、停止执行或重置环境会丢弃内存中的 Python 状态。对话中已保存的附件及成果可以在后续运行中重新载入，但不会恢复此前定义的 Python 变量。

文件处理范围：

| 文件 | 处理方式 |
| --- | --- |
| TXT、Markdown、CSV、TSV、JSON、常见代码及配置文件 | 提取文本供模型阅读，也可交给 Python |
| PDF | 浏览器提取前 150 页的可提取文本；扫描件不含自动 OCR |
| DOCX | 提取正文原始文本，不保留 Word 排版 |
| 图片 | 以图片内容发送给支持视觉的模型；可本地预览 |
| XLSX、ZIP 等二进制文件 | 可上传至 Python，由兼容的 Python 包解析；不保证所有文件和依赖可用 |
| 生成的 HTML、Markdown、代码、CSV、JSON、图片等 | 预览或下载；二进制文件可由 Python 生成 |

当前限制：单个上传文件最大 25 MB，单个 Python 回传文件最大 20 MB，每次 Python 调用超时为 120 秒，每轮对话最多自动调用模型 12 次。浏览器可用内存和站点存储额度也会限制文件大小。

Python 环境没有完整 Linux、操作系统终端、Docker 或 Git。它不能提供原版 Codex 的仓库执行环境、电脑控制、私有工具或云任务服务。外部账户连接、原版插件市场、云端共享链接及跨设备同步未接入；界面中的相关入口会说明实际可用范围。

## 数据保存

对话和附件保存在当前浏览器的 IndexedDB；不支持时使用容量受限的 localStorage 备用存储。设置与项目元数据使用 localStorage。清除网站数据、切换浏览器或设备不会保留这些本地数据。

临时聊天不保存聊天历史。使用模型时，相关对话文本、图片以及工具结果会发送到配置的 API 服务商。浏览器语音功能由浏览器自身提供，可能使用浏览器厂商的远程服务。

界面中的 JSON 导出包含聊天、附件、项目名称与项目指令；外观、API 连接与其他个人设置不在导出文件中。导入按 ID 合并，已有对话较新时保留较新版本。“删除所有聊天”会同时清除聊天、全部附件及项目，保留个人设置。重要数据建议通过界面导出备份。

## 本地开发

需要支持 ES Modules 的现代浏览器，以及 Node.js 22 或更新版本。发布文件均为静态资源，没有前端框架构建步骤。

```sh
npm ci
npm run dev
```

打开 <http://127.0.0.1:5173>。使用 HTTP 服务器运行，直接双击 `index.html` 的 `file://` 地址不支持模块和 Worker 的完整工作流程。

检查命令：

```sh
npm run check
npm test
```

`check` 检查应用、传输、Python Worker 和存储模块的 JavaScript 语法。`test` 执行 `tests/` 中的 Node 测试。真实模型响应、浏览器语音、Python 包下载及页面布局仍需在目标浏览器中验证。

`vendor/` 已包含发布需要的 Markdown、消毒、代码高亮、数学公式、PDF 和 DOCX 解析依赖，以及各自许可证。更新依赖后可执行 `node scripts/vendor.mjs` 重新生成浏览器依赖文件；提交生成结果。

## GitHub Pages 部署

仓库为 <https://github.com/tycofficial/chatgpt>，站点使用 GitHub Pages 发布 `main` 分支根目录。

1. 在仓库 **Settings → Pages** 中选择 **Deploy from a branch**。
2. 分支选择 `main`，目录选择 `/ (root)`。
3. 将 `index.html`、JavaScript、CSS、`vendor/` 与 `.nojekyll` 提交至 `main`。
4. 等待 GitHub 的 `pages build and deployment` 成功，访问站点地址。

所有资源使用相对路径，可在 `/chatgpt/` 子路径下运行。`.nojekyll` 使静态模块和依赖直接发布。无需部署 `node_modules/`，也无需在 Pages 上启动 Node 服务。

## 原版前端材料导出

已有本机页面材料时，运行 `npm run reference:export`，将完整保存的页面、原有资源目录和被明确引用的公开静态资源批量导出到 `.test-output/chatgpt-source-export/`。依赖图和原始 URL 映射保存在该目录的 `manifest.json`；原 JS 模块及相对导入关系保持原样。也可用 `--offline` 只整理本机已有材料。

该目录包含原账户页面材料，已被 Git 忽略，应保留在本机。脚本不读取浏览器 Cookie、不调用私有 API，也不执行下载的原始代码。导出范围是已保存页面和已发现的前端依赖；它不包含服务端实现，也不会自动把这些文件变成可独立运行的原版客户端。
