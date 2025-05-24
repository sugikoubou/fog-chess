// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import './App.css'; // App.css もしくは index.css にスタイルを記述
// import './index.css'; // もし Tailwind の設定を index.css で行っているなら

// 仮のチェスロジック (いずれ utils/chessLogic.js などに移動)
const ROWS = 8;
const COLS = 8;
const COL_CHARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const PIECE_TYPES = { PAWN: 'Pawn', ROOK: 'Rook', /* ... */ KING: 'King' };
const UNICODE_PIECES = {
    white: { [PIECE_TYPES.PAWN]: '♙', /* ... */ [PIECE_TYPES.KING]: '♔' },
    black: { [PIECE_TYPES.PAWN]: '♟︎', /* ... */ [PIECE_TYPES.KING]: '♚' }
};
function createPiece(type, color) { /* ... (元のJSから) ... */ return {type, color, unicode: UNICODE_PIECES[color][type], hasMoved: false, visionRange: 1}; }

function App() {
    const [board, setBoard] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState('white');
    const [selectedPieceInfo, setSelectedPieceInfo] = useState(null); // { piece, row, col }
    const [visibleCells, setVisibleCells] = useState(new Set());
    const [validMoveCandidates, setValidMoveCandidates] = useState(new Set());
    const [message, setMessage] = useState('');
    const [turnIndicator, setTurnIndicator] = useState('');
    const [gameOver, setGameOver] = useState(false);

    // ボードの初期化 (useEffect を使用)
    useEffect(() => {
        initializeBoardState();
    }, []);

    // 手番が変わった時などに可視セルを更新
    useEffect(() => {
        if (!gameOver) {
            updateVisibleCellsState();
            updateTurnIndicatorContent();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPlayer, board, gameOver]); // gameOver を依存配列に追加


    function initializeBoardState() {
        const initialBoard = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
        // ... (元の initializeBoard のロジックをここに移植して initialBoard を駒で埋める) ...
        // 例:
        initialBoard[0][0] = createPiece(PIECE_TYPES.ROOK, 'black');
        initialBoard[0][1] = createPiece(PIECE_TYPES.KNIGHT, 'black');
        // (中略) ポーンの配置
        for (let c = 0; c < COLS; c++) initialBoard[1][c] = createPiece(PIECE_TYPES.PAWN, 'black');
        for (let c = 0; c < COLS; c++) initialBoard[6][c] = createPiece(PIECE_TYPES.PAWN, 'white');
        // (中略) 白の駒の配置
        initialBoard[7][0] = createPiece(PIECE_TYPES.ROOK, 'white');
        initialBoard[7][1] = createPiece(PIECE_TYPES.KNIGHT, 'white');


        setBoard(initialBoard);
        setCurrentPlayer('white');
        setSelectedPieceInfo(null);
        setValidMoveCandidates(new Set());
        setMessage('');
        setGameOver(false);
        // 可視セルの初期化は currentPlayer と board がセットされた後の useEffect で行う
    }

    function updateVisibleCellsState() {
        const newVisibleCells = new Set();
        // ... (元の updateVisibleCells のロジックをここに移植) ...
        // currentPlayer と board state を参照して newVisibleCells を計算
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = board[r]?.[c]; // boardがまだ空配列の可能性があるのでオプショナルチェイニング
                if (piece && piece.color === currentPlayer) {
                    const vision = piece.visionRange || 1; // デフォルトの視野
                    for (let dr = -vision; dr <= vision; dr++) {
                        for (let dc = -vision; dc <= vision; dc++) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                                newVisibleCells.add(`<span class="math-inline">\{nr\}\-</span>{nc}`);
                            }
                        }
                    }
                }
            }
        }
        setVisibleCells(newVisibleCells);
    }


    function handleCellClick(r, c) {
        if (gameOver) return;
        console.log(`Cell clicked: ${r}, ${c}`);
        // ... (元の handleCellClick のロジックをここに移植) ...
        // setBoard, setCurrentPlayer, setSelectedPieceInfo などを適宜呼び出す
        // 駒の選択、移動、霧の中への移動不可、有効手の表示など
    }

    function updateTurnIndicatorContent() {
        setTurnIndicator(`手番: ${currentPlayer === 'white' ? '白 (♙)' : '黒 (♟︎)'}`);
    }

    // リセットボタン用
    const handleReset = () => {
        initializeBoardState();
    };


    // App.jsx の return 文
    return (
        <div className="bg-gray-100 flex flex-col items-center min-h-screen p-2">
            <div className="text-center mb-4">
                <h1 className="text-3xl font-bold text-gray-800">フォグ・オブ・ウォー チェス</h1>
                <div id="message-area" className="text-lg font-semibold h-6 text-blue-600">{message}</div>
                <div id="turn-indicator" className="text-xl font-bold text-gray-700 mt-1">{turnIndicator}</div>
            </div>

            {/* ボードとラベルのレイアウトは元のHTML/CSSを参考に再現 */}
            <div id="game-layout-wrapper" className="flex justify-center items-start w-full">
                <div id="game-board-layout" className="grid grid-template-columns-[auto_auto_1fr_auto_auto] grid-template-rows-[auto_auto_1fr_auto_auto] gap-0.5">
                    {/* ラベルとボード本体を配置。 Board コンポーネントを中央に。*/}
                    {/* 例: 左側の行ラベル */}
                    <div className="label-cell"></div>  {/* Top-left corner empty */}
                    <div id="col-labels-top" className="grid-column-[3_/_4] grid-row-[1_/_2] grid grid-cols-8">
                        {COL_CHARS.map(char => <div key={char} className="label-cell">{char}</div>)}
                    </div>
                    <div className="label-cell"></div> {/* Top-right corner empty */}

                    <div id="row-labels-left" className="grid-column-[2_/_3] grid-row-[3_/_4] grid grid-rows-8">
                         {Array.from({length: ROWS}, (_, i) => ROWS - i).map(num => <div key={num} className="label-cell">{num}</div>)}
                    </div>

                    <div id="board-wrapper" className="grid-column-[3_/_4] grid-row-[3_/_4]">
                         {board.length > 0 ? ( // boardが初期化されてからBoardコンポーネントをレンダリング
                            <Board
                                boardData={board}
                                visibleCells={visibleCells}
                                selectedPieceInfo={selectedPieceInfo}
                                validMoveCandidates={validMoveCandidates}
                                onCellClick={handleCellClick}
                            />
                        ) : (
                            <div>Loading board...</div>
                        )}
                    </div>
                    <div id="row-labels-right" className="grid-column-[4_/_5] grid-row-[3_/_4] grid grid-rows-8">
                         {Array.from({length: ROWS}, (_, i) => ROWS - i).map(num => <div key={num} className="label-cell">{num}</div>)}
                    </div>
                    <div className="label-cell"></div> {/* Bottom-left corner empty */}
                    <div id="col-labels-bottom" className="grid-column-[3_/_4] grid-row-[5_/_6] grid grid-cols-8">
                        {COL_CHARS.map(char => <div key={char} className="label-cell">{char}</div>)}
                    </div>
                    <div className="label-cell"></div> {/* Bottom-right corner empty */}
                </div>
            </div>

            <button
                id="reset-button"
                onClick={handleReset}
                className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition duration-150 ease-in-out"
            >
                リセット
            </button>
        </div>
    );
}
export default App;