// server/src/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors()); // すべてのオリジンからのリクエストを許可 (開発用)

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Vite のデフォルトポート (フロントエンドのURLに合わせて変更)
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
    res.send('Fog of War Chess Server is running!');
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    // ここにチェスゲーム関連のソケットイベントリスナーを追加していく
    // 例: socket.on('playerMove', (moveData) => { ... });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});