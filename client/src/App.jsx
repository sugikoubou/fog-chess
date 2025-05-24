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
  BOARD_SIZE, // カンマ抜けを修正
  getVisibleSquaresForPlayer // 追加
} from '../../common/chessLogic'; // common からインポート

// VITE_BACKEND_URL の設定: Render環境では環境変数から、ローカルではデフォルト値
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
  const [visibleSquares, setVisibleSquares] = useState(new Set()); // 「戦場の霧」用

  // Socket.IO イベントリスナー設定
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
  }, []); // マウント時にリスナー登録、アンマウント時に解除

  // 「戦場の霧」のための visibleSquares 更新ロジック
  useEffect(() => {
    if (playerColor && boardState) {
      const currentVisibleSquares = getVisibleSquaresForPlayer(boardState, playerColor);
      setVisibleSquares(currentVisibleSquares);
      console.log('CLIENT LOG: Visible squares updated for player', playerColor, '- Count:', currentVisibleSquares.size);
    } else {
      setVisibleSquares(new Set()); // プレイヤーカラーがない場合は霧をクリア（または全マス霧）
    }
  }, [boardState, playerColor]); // boardStateかplayerColorが変わったら再計算

  const handleSquareClick = (row, col) => {
    console.log(`CLIENT LOG: Square clicked (${row}, ${col})`);
    if (gameStatus !== 'playing') {
      console.log('CLIENT LOG: Game not in playing status.');
      return;
    }
    if (!playerColor && !room) {
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
      // クリックしたマスが見えているか確認 (霧ルール)
      if (!visibleSquares.has(`${row}-${col}`)) {
          console.log('CLIENT LOG: Clicked on a foggy square. Cannot move or select.');
          setSelectedPiece(null); // 選択解除
          setLegalMoves([]);
          return;
      }

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
        const moves = getLegalMovesForPiece(clickedPieceData, boardState, lastMove, visibleSquares, playerColor); // visibleSquares と playerColor を渡す
        setLegalMoves(moves);
      } else {
        console.log('CLIENT LOG: Clicked invalid square or deselecting.');
        setSelectedPiece(null);
        setLegalMoves([]);
      }
    } else if (clickedPieceData && clickedPieceData.color === currentPlayer) {
      // 駒を初めて選択する場合も、そのマスが見えているか確認
      if (!visibleSquares.has(`${row}-${col}`)) {
          console.log('CLIENT LOG: Cannot select piece in a foggy square.');
          return;
      }
      console.log('CLIENT LOG: Selected own piece.');
      setSelectedPiece({ piece: clickedPieceData, position: { row, col } });
      // 合法手の計算にも visibleSquares と playerColor を渡す (chessLogic側の修正が必要になる場合)
      const moves = getLegalMovesForPiece(clickedPieceData, boardState, lastMove, visibleSquares, playerColor);
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
        <p>Visible Squares Count: {visibleSquares.size}</p>
      </div>

      {!room && (
          <button
            onClick={handleFindGame}
            style={{ backgroundColor: 'orange', padding: '10px', margin: '10px', fontSize: '1.2em' }}
          >
            (Debug) Force Find Game
          </button>
      )}

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
          visibleSquares={visibleSquares}
          playerColor={playerColor}
        />
        <GameInfo
          currentPlayer={currentPlayer}
          selectedPieceFOV={selectedPiece?.piece?.fovRange}
          capturedPieces={capturedPieces}
          gameStatus={gameStatus}
        />
      </div>
    </div>
  );
}

export default App;
