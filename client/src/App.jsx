// client/src/App.jsx
import { useState, useEffect } from 'react';
import './App.css';
import { io } from 'socket.io-client';
import Board from './components/Board';
import GameInfo from './components/GameInfo'; // 後で作成
import {
  initializeBoard,
  getLegalMovesForPiece,
  applyMove,
  checkGameOver,
  COLORS,
  PIECE_TYPES,
  // isSquareVisibleToColor, // ポーンの初手判定で使用
  // isSquareInPieceFOV // 駒自身の視界判定で使用
} from '../../common/chessLogic'; // common からインポート

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://fog-chess.onrender.com/";
const socket = io(VITE_BACKEND_URL);

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [boardState, setBoardState] = useState(initializeBoard());
  const [currentPlayer, setCurrentPlayer] = useState(COLORS.WHITE); // 白から開始
  const [selectedPiece, setSelectedPiece] = useState(null); // { piece, position: {row, col} }
  const [legalMoves, setLegalMoves] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ [COLORS.WHITE]: [], [COLORS.BLACK]: [] });
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'white_wins', 'black_wins'
  const [playerColor, setPlayerColor] = useState(null); // 自分の駒の色 (オンライン対戦用)
  const [room, setRoom] = useState(null);
  const [lastMove, setLastMove] = useState(null); // { piece, from, to } アンパッサンやUIハイライト用

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('assignColor', (assignedColor) => {
      setPlayerColor(assignedColor);
      console.log(`You are ${assignedColor}`);
    });

    socket.on('gameStart', ({ board, turn, roomId }) => {
        console.log(`Game started in room ${roomId}. Your turn: ${turn === playerColor}`);
        setBoardState(board); // サーバーから初期盤面を受け取る
        setCurrentPlayer(turn);
        setRoom(roomId);
        setGameStatus('playing');
        setCapturedPieces({ [COLORS.WHITE]: [], [COLORS.BLACK]: [] });
        setSelectedPiece(null);
        setLegalMoves([]);
        setLastMove(null);
    });


    socket.on('gameStateUpdate', ({ board, turn, newLastMove, newCapturedPieces }) => {
      setBoardState(board);
      setCurrentPlayer(turn);
      setLastMove(newLastMove);
      if (newCapturedPieces) {
         setCapturedPieces(prev => ({
            [COLORS.WHITE]: [...(prev[COLORS.WHITE] || []), ...(newCapturedPieces[COLORS.WHITE] || [])],
            [COLORS.BLACK]: [...(prev[COLORS.BLACK] || []), ...(newCapturedPieces[COLORS.BLACK] || [])],
         }));
      }
      const gameOverStatus = checkGameOver(board);
      if (gameOverStatus) {
        setGameStatus(gameOverStatus);
      }
    });

    socket.on('gameOver', (status) => {
      setGameStatus(status.message); // 例: "white_wins by king capture"
      alert(`Game Over: ${status.winner} wins! (${status.reason})`);
    });

    socket.on('invalidMove', (message) => {
      alert(`Invalid Move: ${message}`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('assignColor');
      socket.off('gameStart');
      socket.off('gameStateUpdate');
      socket.off('gameOver');
      socket.off('invalidMove');
    };
  }, [playerColor]); // playerColor の変更時にも再登録（特にgameStart）

  const handleSquareClick = (row, col) => {
    if (gameStatus !== 'playing') return;
    if (playerColor && currentPlayer !== playerColor) {
        console.log("Not your turn or you are an observer.");
        return;
    }


    const clickedPiece = boardState[row][col];

    if (selectedPiece) {
      const { piece: currentSelectedPiece, position: fromPos } = selectedPiece;
      const targetMove = legalMoves.find(move => move.row === row && move.col === col);

      if (targetMove) { // 有効な移動先をクリック
        // 昇格の処理 (もしあれば)
        let promotionPieceType = null;
        if (currentSelectedPiece.type === PIECE_TYPES.PAWN &&
            ((currentSelectedPiece.color === COLORS.WHITE && row === 0) ||
             (currentSelectedPiece.color === COLORS.BLACK && row === BOARD_SIZE - 1))) {
            // UIで選択させるべきだが、ここでは仮にクイーンに昇格
            promotionPieceType = prompt("Promote pawn to (q, r, b, n)?", "q")?.toLowerCase();
            if (![PIECE_TYPES.QUEEN, PIECE_TYPES.ROOK, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT].includes(promotionPieceType)) {
                promotionPieceType = PIECE_TYPES.QUEEN; // デフォルト
            }
        }

        const moveData = {
            from: fromPos,
            to: { row, col },
            piece: currentSelectedPiece, // 送る駒情報も含むとサーバーで検証しやすい
            promotion: promotionPieceType,
            room: room // ルーム情報も送る
        };
        socket.emit('makeMove', moveData); // バックエンドに手を送信

        // サーバーからの gameStateUpdate を待つので、クライアント側での盤面更新はそれに任せる
        setSelectedPiece(null);
        setLegalMoves([]);

      } else if (clickedPiece && clickedPiece.color === currentPlayer) {
        // 自分の別の駒を選択
        setSelectedPiece({ piece: clickedPiece, position: { row, col } });
        const moves = getLegalMovesForPiece(clickedPiece, boardState, lastMove);
        setLegalMoves(moves);
      } else {
        // 無効な場所または選択解除
        setSelectedPiece(null);
        setLegalMoves([]);
      }
    } else if (clickedPiece && clickedPiece.color === currentPlayer) {
      // 新しく自分の駒を選択
      setSelectedPiece({ piece: clickedPiece, position: { row, col } });
      const moves = getLegalMovesForPiece(clickedPiece, boardState, lastMove);
      setLegalMoves(moves);
    }
  };

  const handleFindGame = () => {
    socket.emit('findGame');
    // UI上で「対戦相手を探しています...」などの表示を出すと良い
  };


  return (
    <div className="app-container">
      <h1>Fog Chess</h1>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {!room && playerColor && <button onClick={handleFindGame}>Find Game</button>}
      {room && <p>Room: {room} - You are: {playerColor}</p>}

      <div className="game-area">
        <Board
          boardState={boardState}
          onSquareClick={handleSquareClick}
          selectedPiecePos={selectedPiece?.position}
          legalMoves={legalMoves}
          lastMove={lastMove}
        />
        <GameInfo
          currentPlayer={currentPlayer}
          selectedPieceFOV={selectedPiece?.piece.fovRange}
          capturedPieces={capturedPieces}
          gameStatus={gameStatus}
        />
      </div>
    </div>
  );
}

export default App;