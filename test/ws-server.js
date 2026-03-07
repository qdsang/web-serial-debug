import WebSocket, { WebSocketServer } from 'ws';

// 创建WebSocket服务器，监听8080端口
const wss = new WebSocketServer({ port: 8080 });

// 存储所有连接的客户端
const clients = new Set();

// 生成随机数据
function generateRandomData() {
  return {
    value1: Math.random() * 100,
    value2: Math.random() * 200 - 100,
    value3: Math.sin(Date.now() / 1000) * 50,
    timestamp: Date.now()
  };
}

// 处理客户端连接
wss.on('connection', (ws) => {
  console.log('新客户端连接');
  clients.add(ws);

  // 设置定时器，每秒发送随机数据
  const timer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const data = generateRandomData();
      ws.send(JSON.stringify(data));
    }
  }, 1000);

  // 处理接收到的消息
  ws.on('message', (message) => {
    console.log('收到消息:', message.toString());
    // 回显收到的消息
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message.toString());
    }
  });

  // 处理客户端断开连接
  ws.on('close', () => {
    console.log('客户端断开连接');
    clients.delete(ws);
    clearInterval(timer);
  });

  // 处理错误
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
    clients.delete(ws);
    clearInterval(timer);
  });
});

console.log('WebSocket服务器已启动，监听端口8080');