# TYC 工作台

公网入口 https://tycofficial.github.io/chatgpt/

工作台通过原仓库的 GitHub Pages 发布。入口使用 `workspace.css` 和 `src/native-client/workspace-app.mjs`。会话、文件、工具、Dot 和账户继续使用 `src/native-client/` 的服务适配器。Pages 的发布规则在 `_config.yml`。

```sh
npm ci
npm run check
npm test
npm start
```

本地预览地址为 `http://127.0.0.1:4400/chatgpt/`。`npm run check` 检查入口发布号、离线缓存版本、浏览器模块依赖及公开配置。

- Free 开放标准 Chat。Plus 增加 Work 和 Codex，Pro 增加 Dot。注册账户的文字历史与试用套餐通过原 `chatgpt-services` 服务同步。附件原件保存在上传设备。
- Work 和 Codex 的默认精选集包含六档，消费者默认 GPT‑6.2 Sol 轻度。手选模型和思考等级分别保存。Ultra 由本站的 `delegate_tasks` 并行执行器处理。选择加速后，会话显示网关回执的服务档位。
- 页面断开后，客户端按原请求编号读取服务端记录。已有正文和已确认的工具结果继续使用。服务端无法完成的请求会显示中断状态。浏览器里的工作区工具由当前设备执行。
- Dot 使用浏览器语音识别和合成。自动化可以在打开并联网的工作台运行。云电脑需要可用的授权执行服务。
- 模型凭据由账户服务运行时管理。服务端部署与测试说明见 `chatgpt-services/README.md`。
