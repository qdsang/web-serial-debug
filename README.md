# [Web Serial Debugger](https://qdsang.github.io/web-serial-debug/)

基于 Web 的串口调试工具。 [https://qdsang.github.io/web-serial-debug/](https://qdsang.github.io/web-serial-debug/)

## Demo

<table>
<tr>
    <td><img src="./docs/1.png" title="Serial Debugger Preview" /></td>
    <td><img src="./docs/2.png" title="Serial Debugger Preview" /></td>
    <td><img src="./docs/3.png" title="Serial Debugger Preview" /></td>
</tr>
</table>


## 功能特点

- 🔌 支持串口、WebUSB、Websocket、stlink设备连接
- 📝 实时数据收发显示
- 🎨 支持文本和HEX格式数据发送
- 📜 支持自定义脚本编写和执行
- 🎯 快捷发送功能
- ⚙️ 可配置的显示选项
- 🌙 暗色主题支持

## 脚本功能
可以编写JavaScript脚本来实现自动化操作，支持以下API：
- `sendText(text)` - 发送文本数据
- `sendHex(hex)` - 发送HEX格式数据
- `sleep(ms)` - 延时指定毫秒数

## 开发环境要求

- Node.js >= 18.0.0
- 支持 Web Serial API 的现代浏览器（如 Chrome、Edge）

## 编译

```bash
# 安装依赖
yarn install

# 启动开发服务器
yarn dev

# 构建生产版本
yarn build

# 预览生产版本
yarn preview
```

## 参考

https://github.com/devanlai/webstlink  
https://v2.tauri.app/zh-cn/start/  
https://github.com/mateosolinho/AeroTelemProc_VidData/tree/main  
https://github.com/Serial-Studio/Serial-Studio  
https://github.com/klonyyy/MCUViewer  


## 许可证

MIT License
