// server/src/index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid'; // ルームID生成用

// common/chessLogic.js から必要な関数をインポート
// パスは server/src から見た common/ になるように調整してください。
// (package.json の "type": "module" に合わせて import を使用)
import {
  initializeBoard,
  getLegalMovesForPiece, // サーバーサイドでの検証用
  applyMove,
  checkGameOver,
  COLORS,
  PIECE_TYPES
} from "../../common/chessLogic.js"; // パスを修正

const app = express();
app.use(cors());

const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://fog-chess.onrender.com"],
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("Fog Chess server is running!");
});

// --- ゲーム状態管理 ---
const waitingPlayers = []; // マッチング待機中のプレイヤー { id: socket.id, socket }
const gameRooms = {}; // アクティブなゲームルーム { roomId: { players: [socket1, socket2], boardState, currentPlayer, lastMove, capturedPieces } }

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  // マッチング希望
  socket.on("findGame", () => {
    console.log(`Player ${socket.id} is looking for a game.`);
    if (waitingPlayers.some(p => p.id === socket.id)) {
        console.log(`Player ${socket.id} is already in queue.`);
        return; // 既にキューにいる場合は何もしない
    }
    waitingPlayers.push({ id: socket.id, socket });

    if (waitingPlayers.length >= 2) {
      const player1Entry = waitingPlayers.shift();
      const player2Entry = waitingPlayers.shift();

      const player1Socket = player1Entry.socket;
      const player2Socket = player2Entry.socket;

      const roomId = uuidv4();
      player1Socket.join(roomId);
      player2Socket.join(roomId);

      const initialBoard = initializeBoard();
      const firstPlayer = Math.random() < 0.5 ? COLORS.WHITE : COLORS.BLACK; // 先手をランダムに

      gameRooms[roomId] = {
        players: [ // socket.id と color を持つように変更
            { id: player1Socket.id, socket: player1Socket, color: COLORS.WHITE },
            { id: player2Socket.id, socket: player2Socket, color: COLORS.BLACK }
        ],
        boardState: initialBoard,
        currentPlayer: COLORS.WHITE, // 常に白から開始、またはランダム
        lastMove: null,
        capturedPieces: { [COLORS.WHITE]: [], [COLORS.BLACK]: [] },
        playerSockets: { // socket ID と socket インスタンスのマッピング
            [player1Socket.id]: player1Socket,
            [player2Socket.id]: player2Socket,
        }
      };

      // プレイヤーの色を割り当て
      // player1 が白、player2 が黒とする
      player1Socket.emit("assignColor", COLORS.WHITE);
      player2Socket.emit("assignColor", COLORS.BLACK);
      
      // 両プレイヤーにゲーム開始を通知
      const gameStartData = {
        roomId,
        board: gameRooms[roomId].boardState,
        turn: gameRooms[roomId].currentPlayer,
      };
      io.to(roomId).emit("gameStart", gameStartData);
      console.log(`Game started in room ${roomId} between ${player1Socket.id} (W) and ${player2Socket.id} (B)`);
    } else {
      socket.emit("message", "Waiting for another player..."); // 待機中メッセージ
    }
  });

  // 着手処理
  socket.on("makeMove", (moveData) => {
    const { from, to, piece, promotion, room } = moveData;
    const gameRoom = gameRooms[room];

    if (!gameRoom) {
      socket.emit("invalidMove", "Game room not found.");
      return;
    }

    const playerInRoom = gameRoom.players.find(p => p.id === socket.id);
    if (!playerInRoom) {
        socket.emit("invalidMove", "You are not in this game room.");
        return;
    }
    const playerColor = playerInRoom.color;

    // 1. 手番の検証
    if (gameRoom.currentPlayer !== playerColor) {
      socket.emit("invalidMove", "Not your turn.");
      return;
    }

    // 2. 駒の所有権の検証 (送られてきた駒情報と盤面の駒が一致するか)
    const pieceOnBoard = gameRoom.boardState[from.row][from.col];
    if (!pieceOnBoard || pieceOnBoard.id !== piece.id || pieceOnBoard.color !== playerColor) {
      socket.emit("invalidMove", "Invalid piece or piece does not belong to you.");
      return;
    }

    // 3. 合法手の検証 (common/chessLogic.js を使用)
    // getLegalMovesForPiece は piece オブジェクトを期待するので、盤面から取得したものを使用
    const legalMoves = getLegalMovesForPiece(pieceOnBoard, gameRoom.boardState, gameRoom.lastMove);
    const isValidMove = legalMoves.some(
      (legalMove) => legalMove.row === to.row && legalMove.col === to.col
    );

    if (!isValidMove) {
      socket.emit("invalidMove", "The move is not legal.");
      return;
    }
    
    // 4. 手を適用し、盤面を更新
    const capturedPiece = gameRoom.boardState[to.row][to.col]; // 取られる駒 (もしあれば)
    const newBoardState = applyMove(gameRoom.boardState, pieceOnBoard, to, promotion);
    
    const newCapturedPieces = { ...gameRoom.capturedPieces };
    if (capturedPiece) {
        newCapturedPieces[capturedPiece.color === COLORS.WHITE ? COLORS.WHITE : COLORS.BLACK].push(capturedPiece);
    }
    // アンパッサンで取られた駒の処理
    const movedPiece = newBoardState[to.row][to.col]; // applyMove後の駒
    if (pieceOnBoard.type === PIECE_TYPES.PAWN && to.col !== from.col && !capturedPiece) {
        // アンパッサンで取られた駒は、元のポーンと同じ行、移動先の列にいたはず
        const enPassantCapturedRow = from.row;
        const enPassantCapturedCol = to.col;
        // applyMove 内で処理されるべきだが、念のため
        const actualCapturedPawn = gameRoom.boardState[enPassantCapturedRow][enPassantCapturedCol]; // applyMove前の盤面で確認
        if (actualCapturedPawn && actualCapturedPawn.type === PIECE_TYPES.PAWN && actualCapturedPawn.color !== pieceOnBoard.color) {
            newCapturedPieces[actualCapturedPawn.color].push(actualCapturedPawn);
        }
    }


    gameRoom.boardState = newBoardState;
    gameRoom.currentPlayer = gameRoom.currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    gameRoom.lastMove = { piece: movedPiece, from, to }; // pieceは更新後のもの
    gameRoom.capturedPieces = newCapturedPieces;


    // 5. ゲーム状態をクライアントに送信
    io.to(room).emit("gameStateUpdate", {
      board: gameRoom.boardState,
      turn: gameRoom.currentPlayer,
      newLastMove: gameRoom.lastMove,
      newCapturedPieces: { // 差分ではなく、更新された全リストを送る方がクライアントは楽かも
        [COLORS.WHITE]: gameRoom.capturedPieces[COLORS.WHITE],
        [COLORS.BLACK]: gameRoom.capturedPieces[COLORS.BLACK],
      }
    });

    // 6. ゲーム終了判定
    const gameOverStatus = checkGameOver(gameRoom.boardState);
    if (gameOverStatus) {
      const winner = gameOverStatus.startsWith(COLORS.WHITE) ? COLORS.WHITE : COLORS.BLACK;
      io.to(room).emit("gameOver", { winner, reason: "King captured" });
      console.log(`Game Over in room ${room}. Winner: ${winner}`);
      // ルーム情報を削除または非アクティブ化
      delete gameRooms[room];
    }
  });

  // 切断処理
  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    // 待機リストから削除
    const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
      console.log(`Player ${socket.id} removed from waiting queue.`);
    }

    // ゲームルームから削除し、相手に通知
    for (const roomId in gameRooms) {
      const room = gameRooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const opponent = room.players.find(p => p.id !== socket.id);
        if (opponent && opponent.socket) {
          opponent.socket.emit("gameOver", {
            winner: opponent.color, // 生き残った方が勝ち
            reason: "Opponent disconnected",
          });
          console.log(`Player ${socket.id} disconnected from room ${roomId}. Opponent ${opponent.id} wins.`);
        }
        delete gameRooms[roomId]; // ルームを削除
        break;
      }
    }
  });

  // (既存の clientMessage はデバッグ用に残しても良い)
  socket.on("clientMessage", (data) => {
    console.log("Message from client:", data);
    io.emit("serverMessage", `Server received: ${data}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});