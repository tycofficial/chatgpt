# ChatGPT Web

公网入口 https://tycofficial.github.io/chatgpt/

GitHub Pages 载入获授权的原界面组件。`original-client/public/` 保存上游公开静态资源。`src/native-client/` 对接本站账户、推理、文件和工具，`native-client/active.json` 记录实际发布的适配器版本和上游 UI 构建号。

```sh
npm ci
npm run reference:check
npm run release:prepare
npm run native:check
npm start
```

本地地址为 `http://127.0.0.1:4400/chatgpt/`。`reference:check` 读取官网公开的构建号和入口清单，避免采集登录会话和私人内容。切换上游构建需要核对新的资源清单、组件模块入口和服务适配器，再通过浏览器验收。

Free 开放标准 Chat，Plus 增加 Work 和 Codex，Pro 增加 Dot。模型请求通过现有账户服务发出，断线后按原请求编号接回。注册账户同步文字历史和套餐。浏览器保留附件原件，图片以适合推理的尺寸传送。

账户和推理服务的部署、配置及测试见 `chatgpt-services/README.md`。
