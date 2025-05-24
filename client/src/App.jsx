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

// VITE_BACKEND_URL の設定: Render環境では環境変数から、ローカルではデフォルト値
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://fog-chess.onrender.com/"; // デプロイ先のバックエンドURLをデフォルトに
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
    // 接続イベントのリスナー
    const onConnect = () => {
      setIsConnected(true);
      console.log('Socket connected');
    };
    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // サーバーからのイベントリスナー
    const onAssignColor = (assignedColor) => {
      console.log('CLIENT LOG: assignColor event received. Color:', assignedColor);
      setPlayerColor(assignedColor);
    };
    socket.on('assignColor', onAssignColor);

    const onGameStart = ({ board, turn, roomId }) => {
      console.log(`CLIENT LOG: gameStart event received - Room ID: ${roomId}, Turn: ${turn}`);
      // setBoardState(board); // サーバーから初期盤面を受け取る場合 (今回はローカルで初期化)
      setCurrentPlayer(turn);
      setRoom(roomId);
      setGameStatus('playing');
      setCapturedPieces({ [COLORS.WHITE]: [], [COLORS.BLACK]: [] }); // キャプチャされた駒をリセット
      setSelectedPiece(null);
      setLegalMoves([]);
      setLastMove(null);
    };
    socket.on('gameStart', onGameStart);

    const onGameStateUpdate = ({ board, turn, newLastMove, newCapturedPieces }) => {
      console.log('CLIENT LOG: gameStateUpdate event received.');
      setBoardState(board);
      setCurrentPlayer(turn);
      setLastMove(newLastMove);
      if (newCapturedPieces) { // newCapturedPieces が存在する場合のみ更新
         setCapturedPieces(prev => ({
            [COLORS.WHITE]: [...(prev[COLORS.WHITE] || []), ...(newCapturedPieces[COLORS.WHITE] || [])],
            [COLORS.BLACK]: [...(prev[COLORS.BLACK] || []), ...(newCapturedPieces[COLORS.BLACK] || [])],
         }));
      }
      const gameOverStatus = checkGameOver(board); // chessLogicから
      if (gameOverStatus) {
        setGameStatus(gameOverStatus);
      }
    };
    socket.on('gameStateUpdate', onGameStateUpdate);

    const onGameOver = (status) => {
      console.log('CLIENT LOG: gameOver event received.', status);
      setGameStatus(status.message || `${status.winner} wins! (${status.reason})`); // メッセージ構造を柔軟に
      alert(`Game Over: ${status.winner} wins! (${status.reason})`);
    };
    socket.on('gameOver', onGameOver);

    const onInvalidMove = (message) => {
      console.warn('CLIENT LOG: invalidMove event received.', message);
      alert(`Invalid Move: ${message}`);
    };
    socket.on('invalidMove', onInvalidMove);

    const onServerMessage = (message) => {
        console.log('CLIENT LOG: Message from server:', message);
        // UIに表示するならここでステートを更新
    };
    socket.on('message', onServerMessage); // サーバーからの 'message' イベントをリッスン

    // クリーンアップ関数
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('assignColor', onAssignColor);
      socket.off('gameStart', onGameStart);
      socket.off('gameStateUpdate', onGameStateUpdate);
      socket.off('gameOver', onGameOver);
      socket.off('invalidMove', onInvalidMove);
      socket.off('message', onServerMessage);
    };
  }, []); // 依存配列は空でOK (マウント時にリスナー登録、アンマウント時に解除)

  const handleSquareClick = (row, col) => {
    console.log(`CLIENT LOG: Square clicked (${row}, ${col})`);
    if (gameStatus !== 'playing') {
      console.log('CLIENT LOG: Game not in playing status.');
      return;
    }
    if (playerColor && currentPlayer !== playerColor) { // 自分の手番か、または観戦者でないか
        console.log(`CLIENT LOG: Not your turn. Current: ${currentPlayer}, Yours: ${playerColor}`);
        return;
    }
    if (!playerColor && room) { // ルームにはいるが、色が未割り当て (観戦モードなど将来的に)
        console.log('CLIENT LOG: In room, but no player color assigned (observer?).');
        return;
    }
    if (!room && !playerColor) { // Find Game 前の状態
        console.log('CLIENT LOG: Not in a room and no player color. Please find a game.');
        return;
    }


    const clickedPieceData = boardState[row][col];

    if (selectedPiece) {
      const { piece: currentSelectedPiece, position: fromPos } = selectedPiece;
      const targetMove = legalMoves.find(move => move.row === row && move.col === col);

      if (targetMove) {
        let promotionPieceType = null;
        if (currentSelectedPiece.type === PIECE_TYPES.PAWN &&
            ((currentSelectedPiece.color === COLORS.WHITE && row === 0) ||
             (currentSelectedPiece.color === COLORS.BLACK && row === BOARD_SIZE - 1))) { // BOARD_SIZE を common/chessLogic からインポートするか、直接 7 や 0 を使う
            const promo = prompt("Promote pawn to (q, r, b, n)?", "q")?.toLowerCase();
            const validPromotions = {
                'q': PIECE_TYPES.QUEEN, 'r': PIECE_TYPES.ROOK,
                'b': PIECE_TYPES.BISHOP, 'n': PIECE_TYPES.KNIGHT
            };
            promotionPieceType = validPromotions[promo] || PIECE_TYPES.QUEEN;
        }

        const moveData = {
            from: fromPos,
            to: { row, col },
            pieceId: currentSelectedPiece.id, // 駒のIDを送る方がサーバーで特定しやすい
            promotion: promotionPieceType,
            room: room
        };
        console.log('CLIENT LOG: Emitting makeMove event with data:', moveData);
        socket.emit('makeMove', moveData);

        setSelectedPiece(null);
        setLegalMoves([]);
      } else if (clickedPieceData && clickedPieceData.color === currentPlayer) {
        console.log('CLIENT LOG: Selected another own piece.');
        setSelectedPiece({ piece: clickedPieceData, position: { row, col } });
        const moves = getLegalMovesForPiece(clickedPieceData, boardState, lastMove);
        setLegalMoves(moves);
      } else {
        console.log('CLIENT LOG: Clicked invalid square or deselecting.');
        setSelectedPiece(null);
        setLegalMoves([]);
      }
    } else if (clickedPieceData && clickedPieceData.color === currentPlayer) {
      console.log('CLIENT LOG: Selected own piece.');
      setSelectedPiece({ piece: clickedPieceData, position: { row, col } });
      const moves = getLegalMovesForPiece(clickedPieceData, boardState, lastMove);
      setLegalMoves(moves);
    } else {
      console.log('CLIENT LOG: Clicked empty square or opponent piece without selection.');
    }
  };

  const handleFindGame = () => {
    console.log('CLIENT LOG: findGame button clicked. Emitting findGame event.');
    socket.emit('findGame');
    // UI上で「対戦相手を探しています...」などの表示を出す場合は、ここでステートを更新
  };

  // デバッグ用のログを追加
  // console.log('Render App:', { isConnected, playerColor, room, currentPlayer, gameStatus });

  return (
    <div className="app-container">
      <h1>Fog Chess</h1>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>

      {/* デバッグ用表示 */}
      <div style={{ border: '1px solid red', margin: '10px', padding: '10px' }}>
        <p><strong>Debug Info:</strong></p>
        <p>Player Color: {playerColor || 'Not assigned'}</p>
        <p>Room ID: {room || 'Not in a room'}</p>
        <p>Is Connected: {isConnected ? 'Yes' : 'No'}</p>
        <p>Current Turn: {currentPlayer}</p>
        <p>Game Status: {gameStatus}</p>
      </div>


      {!room && playerColor && ( // ルームに入っておらず、自分の色が決まっている場合のみ「Find Game」表示
        <button onClick={handleFindGame}>Find Game</button>
      )}
      {room && <p>Room: {room} - You are: {playerColor || 'Observer?'}</p>}

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
          selectedPieceFOV={selectedPiece?.piece.fovRange} // selectedPieceがnullの場合のエラーを避ける
          capturedPieces={capturedPieces}
          gameStatus={gameStatus}
        />
      </div>
    </div>
  );
}

export default App;