// client/src/App.jsx
import { useState, useEffect } from 'react';
import './App.css';
import { io } from 'socket.io-client';
import Board from './components/Board'; // 盤面コンポーネント
import GameInfo from './components/GameInfo'; // ゲーム情報コンポーネント
import {
  initializeBoard,
  getLegalMovesForPiece,
  applyMove,
  checkGameOver,
  COLORS,
  PIECE_TYPES,
  BOARD_SIZE,
  getVisibleSquaresForPlayer // 「戦場の霧」のための関数
} from '../../common/chessLogic'; // 共有ロジック

// バックエンドURLの設定 (Render環境変数を優先)
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://fog-chess.onrender.com/";
const socket = io(VITE_BACKEND_URL);

function App() {
  // --- ステート定義 ---
  const [isConnected, setIsConnected] = useState(socket.connected); // Socket接続状態
  const [boardState, setBoardState] = useState(initializeBoard());   // 現在の盤面状態
  const [currentPlayer, setCurrentPlayer] = useState(COLORS.WHITE); // 現在の手番プレイヤー
  const [selectedPiece, setSelectedPiece] = useState(null);         // 選択中の駒情報
  const [legalMoves, setLegalMoves] = useState([]);                 // 選択中駒の合法手
  const [capturedPieces, setCapturedPieces] = useState({ [COLORS.WHITE]: [], [COLORS.BLACK]: [] }); // 取られた駒
  const [gameStatus, setGameStatus] = useState('playing');          // ゲームの進行状況
  const [playerColor, setPlayerColor] = useState(null);             // このクライアントのプレイヤー色
  const [room, setRoom] = useState(null);                           // 現在のルームID
  const [lastMove, setLastMove] = useState(null);                   // 直前の指し手情報
  const [visibleSquares, setVisibleSquares] = useState(new Set());  // 現在のプレイヤーが見えるマスのセット

  // --- Socket.IOイベントリスナー設定 ---
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
      // setBoardState(board); // 必要に応じてサーバーからの初期盤面を使用
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

    // コンポーネントアンマウント時にリスナーを解除
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
  }, []); // 空の依存配列で、マウント・アンマウント時にのみ実行

  // --- 「戦場の霧」のための visibleSquares 更新ロジック ---
  useEffect(() => {
    if (playerColor && boardState) {
      const currentVisibleSquares = getVisibleSquaresForPlayer(boardState, playerColor);
      setVisibleSquares(currentVisibleSquares);
      console.log('CLIENT LOG: Visible squares updated for player', playerColor, '- Count:', currentVisibleSquares.size);
    } else {
      setVisibleSquares(new Set()); // プレイヤーカラーがない場合は視界情報をクリア
    }
  }, [boardState, playerColor]); // boardState または playerColor が変更されたら再計算

  // --- UIイベントハンドラ ---
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

    const clickedSquareKey = `${row}-${col}`; // Square.jsx でのキー形式に合わせる
    const clickedPieceData = boardState[row][col];

    if (selectedPiece) {
      const { piece: currentSelectedPiece, position: fromPos } = selectedPiece;

      // クリックしたマスが見えているか確認 (霧ルール)
      if (!visibleSquares.has(clickedSquareKey)) {
          console.log('CLIENT LOG: Clicked on a foggy square. Cannot move or select.');
          setSelectedPiece(null);
          setLegalMoves([]);
          return;
      }

      const targetMove = legalMoves.find(move => move.row === row && move.col === col);

      if (targetMove) { // 有効な移動先をクリック
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
      } else if (clickedPieceData && clickedPieceData.color === currentPlayer) { // 自分の別の駒を選択
        console.log('CLIENT LOG: Selected another own piece.');
        setSelectedPiece({ piece: clickedPieceData, position: { row, col } });
        // ★注意: getLegalMovesForPiece が visibleSquares を引数に取るように chessLogic.js を修正する必要あり
        const moves = getLegalMovesForPiece(clickedPieceData, boardState, lastMove /*, visibleSquares, playerColor */);
        setLegalMoves(moves);
      } else { // 無効な場所または選択解除
        console.log('CLIENT LOG: Clicked invalid square or deselecting.');
        setSelectedPiece(null);
        setLegalMoves([]);
      }
    } else if (clickedPieceData && clickedPieceData.color === currentPlayer) { // 新しく自分の駒を選択
      // 駒を初めて選択する場合も、そのマスが見えているか確認
      if (!visibleSquares.has(clickedSquareKey)) {
          console.log('CLIENT LOG: Cannot select piece in a foggy square.');
          return;
      }
      console.log('CLIENT LOG: Selected own piece.');
      setSelectedPiece({ piece: clickedPieceData, position: { row, col } });
      // ★注意: getLegalMovesForPiece が visibleSquares を引数に取るように chessLogic.js を修正する必要あり
      const moves = getLegalMovesForPiece(clickedPieceData, boardState, lastMove /*, visibleSquares, playerColor */);
      setLegalMoves(moves);
    } else {
      console.log('CLIENT LOG: Clicked empty square or opponent piece without selection (or foggy).');
    }
  };

  const handleFindGame = () => {
    console.log('CLIENT LOG: findGame button clicked. Emitting findGame event.');
    socket.emit('findGame');
  };

  // --- レンダリング ---
  return (
    <div className="app-container">
      <h1>Fog Chess</h1>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>


      {/* マッチングボタンの表示ロジック */}
      {!room && !playerColor && ( // まだ色もルームも割り当てられていない場合
          <button
            onClick={handleFindGame}
            style={{ backgroundColor: 'orange', padding: '10px', margin: '10px', fontSize: '1.2em' }}
          >
            Find Game
          </button>
      )}
      {!room && playerColor && ( // 色は割り当てられたが、まだルームには入っていない場合 (通常はすぐルームに入るはず)
        <p style={{color: 'purple'}}>Waiting for game to start... You are {playerColor}</p>
      )}
      {room && <p style={{color: 'blue', fontWeight: 'bold'}}>Room: {room} - You are: {playerColor || 'Observer?'}</p>}

      <div className="game-area">
        <Board
          boardState={boardState}
          onSquareClick={handleSquareClick}
          selectedPiecePos={selectedPiece?.position}
          legalMoves={legalMoves}
          lastMove={lastMove}
          visibleSquares={visibleSquares} // 「戦場の霧」のために渡す
          playerColor={playerColor}       // 「戦場の霧」のために渡す
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
