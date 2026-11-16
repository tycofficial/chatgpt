# ChatGPT Web

网站入口直接运行已保存的原版前端模块图。原版 React 组件、路由、模型选择器、编辑器和动画一起运行；浏览器宿主、账户存储、模型目录与对话服务通过明确的接口适配到本地浏览器及配置的 API。

网站：https://tycofficial.github.io/chatgpt/

## 源码与构建

- `original-client/public/`：原版公开静态资源，保留模块依赖和文件名。
- `src/native-client/`：可编辑的账户、宿主和 API 适配器源码。
- `native-client/`：带版本号的发布模块；`adapter-provenance.json` 记录来源。
- `native-client-worker.js`：将原版 `/cdn/assets/` 请求映射到 GitHub Pages 项目目录，保留模块关联。
- `index.html` / `404.html`：客户端入口和深链接入口。

```sh
npm run release:prepare
npm run native:check
npm start
```

本地地址为 `http://127.0.0.1:4400/chatgpt/`。构建只依赖仓库内的 `src/native-client`，不需要私人登录页面或浏览器 Cookie。

## 当前接口

Chat 与 Work 使用同一真实网关和本地会话存储。Work 默认六档可以跨模型；手动指定模型后只调整该模型的思考等级。`auto` 是 Chat 前端路由别名，实际调用现有网关模型；Work RPC 目录保持 Luna、Sol、Astra 三个家族。

“添加账户”使用本站用户名和密码登录，登录页也可以注册免费账户。D1 后端固定新账户为 Free，管理员显示本站 Pro；管理员用户名和密码按要求不区分大小写，注册用户的密码区分大小写。密码以 PBKDF2 摘要保存在服务端。免费账户完全隐藏模型选择区，固定 Luna 轻度；原加号菜单的“思考一下”将当前消息切换到中等。不同账户的对话、文件和 Dot 数据分别保存。浏览器保留本站登录会话和偏好；不使用原版网站 Cookie 或 Google 身份。

连续任务采用 Responses 工具调用循环，保存实际工具结果与恢复检查点。刷新通过原版恢复协议续接，余额不足明确报错并保留进度。文件保存在浏览器 OPFS/IndexedDB，Python 使用 Pyodide WebAssembly；这不等于原版私有云执行环境。官方订阅额度的授权本机桥接仍在接入，未授权前不声称已经连接 Pro 额度。

`config.js` 提供本站默认 API 配置。原始登录捕获、会话凭据和私有诊断保留在被 Git 忽略的本地目录。

发布版本包括适配器、运行时、Python Worker 和资源的实际内容指纹。`native:check` 对照可编辑源码、发布代码、入口和资源哈希，发现未打包修改会失败。已打开页面会在对话空闲且没有未发送文字时检查、加载完整新版；离线时保留现有页面。
