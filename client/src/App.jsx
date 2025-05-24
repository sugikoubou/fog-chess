// client/src/App.jsx
import { useState, useEffect } from 'react';
import './App.css';
import { io } from 'socket.io-client';
import Board from './components/Board';
import GameInfo from './components/GameInfo';
import {
  initializeBoard,
  getLegalMovesForPiece,
  applyMove,
  checkGameOver,
  COLORS,
  PIECE_TYPES,
  BOARD_SIZE // BOARD_SIZE をインポート
} from '../../common/chessLogic';

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://fog-chess.onrender.com/";
const socket = io(VITE_BACKEND_URL);

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [boardState, setBoardState] = useState(initializeBoard());
  const [currentPlayer, setCurrentPlayer] = useState(COLORS.WHITE);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ [COLORS.WHITE]: [], [COLORS.BLACK]: [] });
  const [gameStatus, setGameStatus] = useState('playing');
  const [playerColor, setPlayerColor] = useState(null);
  const [room, setRoom] = useState(null);
  const [lastMove, setLastMove] = useState(null);

  useEffect(() => {
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

    const onAssignColor = (assignedColor) => {
      console.log('CLIENT LOG: assignColor event received. Color:', assignedColor);
      setPlayerColor(assignedColor);
    };
    socket.on('assignColor', onAssignColor);

    const onGameStart = ({ board, turn, roomId }) => {
      console.log(`CLIENT LOG: gameStart event received - Room ID: ${roomId}, Turn: ${turn}`);
      // setBoardState(board); // サーバーから初期盤面を受け取る場合はコメント解除
      setCurrentPlayer(turn);
      setRoom(roomId);
      setGameStatus('playing');
      setCapturedPieces({ [COLORS.WHITE]: [], [COLORS.BLACK]: [] });
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
    };
    socket.on('gameStateUpdate', onGameStateUpdate);

    const onGameOver = (status) => {
      console.log('CLIENT LOG: gameOver event received.', status);
      setGameStatus(status.message || `${status.winner} wins! (${status.reason})`);
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
    };
    socket.on('message', onServerMessage);

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
  }, []);

  const handleSquareClick = (row, col) => {
    console.log(`CLIENT LOG: Square clicked (${row}, ${col})`);
    if (gameStatus !== 'playing') {
      console.log('CLIENT LOG: Game not in playing status.');
      return;
    }
    if (!playerColor && !room) { // マッチング前は操作不可
        console.log('CLIENT LOG: Not in a room and no player color. Please find a game first.');
        return;
    }
    if (playerColor && currentPlayer !== playerColor) {
        console.log(`CLIENT LOG: Not your turn. Current: ${currentPlayer}, Yours: ${playerColor}`);
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
             (currentSelectedPiece.color === COLORS.BLACK && row === BOARD_SIZE - 1))) {
            const promoInput = prompt("Promote pawn to (q, r, b, n)?", "q")?.toLowerCase();
            const validPromotions = {
                'q': PIECE_TYPES.QUEEN, 'r': PIECE_TYPES.ROOK,
                'b': PIECE_TYPES.BISHOP, 'n': PIECE_TYPES.KNIGHT
            };
            promotionPieceType = validPromotions[promoInput] || PIECE_TYPES.QUEEN;
        }

        const moveData = {
            from: fromPos,
            to: { row, col },
            pieceId: currentSelectedPiece.id,
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
  };

  return (
    <div className="app-container">
      <h1>Fog Chess</h1>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>

      <div style={{ border: '1px solid red', margin: '10px', padding: '10px', backgroundColor: '#ffe0e0' }}>
        <p><strong>Debug Info (Client State):</strong></p>
        <p>Player Color: {playerColor || 'Not assigned'}</p>
        <p>Room ID: {room || 'Not in a room'}</p>
        <p>Is Connected: {isConnected ? 'Yes' : 'No'}</p>
        <p>Current Turn: {currentPlayer}</p>
        <p>Game Status: {gameStatus}</p>
      </div>

      {/* 強制的に表示するデバッグ用ボタン */}
      {!room && ( // まだルームに入っていない場合のみ表示
          <button
            onClick={handleFindGame}
            style={{ backgroundColor: 'orange', padding: '10px', margin: '10px', fontSize: '1.2em' }}
          >
            (Debug) Force Find Game
          </button>
      )}

      {/* 元の表示条件のボタン (playerColorがセットされたらこちらが表示されるはず) */}
      {!room && playerColor && (
        <button onClick={handleFindGame} style={{ backgroundColor: 'lightgreen', padding: '10px', margin: '10px' }}>
          Find Game
        </button>
      )}
      {room && <p style={{color: 'blue', fontWeight: 'bold'}}>Room: {room} - You are: {playerColor || 'Observer?'}</p>}

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
          selectedPieceFOV={selectedPiece?.piece?.fovRange} // Optional chaining
          capturedPieces={capturedPieces}
          gameStatus={gameStatus}
        />
      </div>
    </div>
  );
}

export default App;
