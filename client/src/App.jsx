// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import Board from './components/Board'; // Board.jsx のパス
// App.css や index.css のインポートは適切に行われている前提
import './index.css'; // もしTailwindの基本設定やカスタムCSSがここにあれば

const ROWS = 8;
const COLS = 8;
const COL_CHARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const PIECE_TYPES = {
    PAWN: 'Pawn', ROOK: 'Rook', KNIGHT: 'Knight',
    BISHOP: 'Bishop', QUEEN: 'Queen', KING: 'King'
};

const UNICODE_PIECES = {
    white: {
        [PIECE_TYPES.PAWN]: '♙', [PIECE_TYPES.ROOK]: '♖', [PIECE_TYPES.KNIGHT]: '♘',
        [PIECE_TYPES.BISHOP]: '♗', [PIECE_TYPES.QUEEN]: '♕', [PIECE_TYPES.KING]: '♔'
    },
    black: {
        [PIECE_TYPES.PAWN]: '♟︎', [PIECE_TYPES.ROOK]: '♜', [PIECE_TYPES.KNIGHT]: '♞',
        [PIECE_TYPES.BISHOP]: '♝', [PIECE_TYPES.QUEEN]: '♛', [PIECE_TYPES.KING]: '♚'
    }
};

const PIECE_VISION_RANGES = {
    [PIECE_TYPES.PAWN]: 1, [PIECE_TYPES.ROOK]: 3, [PIECE_TYPES.KNIGHT]: 2,
    [PIECE_TYPES.BISHOP]: 1, [PIECE_TYPES.QUEEN]: 2, [PIECE_TYPES.KING]: 1
};

function createPiece(type, color) {
    // 渡された type 文字列が、定義済みの駒の種類のいずれかに含まれるかチェック
    // Object.values(PIECE_TYPES) は ["Pawn", "Rook", ...] という配列を返す
    if (!Object.values(PIECE_TYPES).includes(type)) {
        console.error(`Unknown piece type string: ${type}`);
        return null;
    }
    if (!UNICODE_PIECES[color] || !UNICODE_PIECES[color][type]) {
        console.error(`Unicode not found for ${color} ${type}`);
        return null;
    }
    if (PIECE_VISION_RANGES[type] === undefined) {
         console.warn(`Vision range not defined for ${type}, defaulting to 1.`);
    }
    return {
        type, color, unicode: UNICODE_PIECES[color][type],
        hasMoved: false, visionRange: PIECE_VISION_RANGES[type] || 1
    };
}

function App() {
    const [board, setBoard] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState('white');
    const [selectedPieceInfo, setSelectedPieceInfo] = useState(null);
    const [visibleCells, setVisibleCells] = useState(new Set());
    const [validMoveCandidates, setValidMoveCandidates] = useState(new Set());
    const [message, setMessage] = useState('');
    const [turnIndicator, setTurnIndicator] = useState('');
    const [gameOver, setGameOver] = useState(false);
    // const [enPassantTargetSquare, setEnPassantTargetSquare] = useState(null);
    // const [lastMove, setLastMove] = useState(null);

    useEffect(() => {
        initializeBoardState();
    }, []);

    useEffect(() => {
        // App.jsx の return 文の直前に console.log を追加
        console.log('App rendering. Board state:', JSON.parse(JSON.stringify(board)));
        if (!gameOver) {
            updateVisibleCellsState();
            updateTurnIndicatorContent();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPlayer, board, gameOver]);


    function initializeBoardState() {
        const initialBoard = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
        initialBoard[0][0] = createPiece(PIECE_TYPES.ROOK, 'black');
        initialBoard[0][1] = createPiece(PIECE_TYPES.KNIGHT, 'black');
        initialBoard[0][2] = createPiece(PIECE_TYPES.BISHOP, 'black');
        initialBoard[0][3] = createPiece(PIECE_TYPES.QUEEN, 'black');
        initialBoard[0][4] = createPiece(PIECE_TYPES.KING, 'black');
        initialBoard[0][5] = createPiece(PIECE_TYPES.BISHOP, 'black');
        initialBoard[0][6] = createPiece(PIECE_TYPES.KNIGHT, 'black');
        initialBoard[0][7] = createPiece(PIECE_TYPES.ROOK, 'black');
        for (let c = 0; c < COLS; c++) initialBoard[1][c] = createPiece(PIECE_TYPES.PAWN, 'black');
        initialBoard[7][0] = createPiece(PIECE_TYPES.ROOK, 'white');
        initialBoard[7][1] = createPiece(PIECE_TYPES.KNIGHT, 'white');
        initialBoard[7][2] = createPiece(PIECE_TYPES.BISHOP, 'white');
        initialBoard[7][3] = createPiece(PIECE_TYPES.QUEEN, 'white');
        initialBoard[7][4] = createPiece(PIECE_TYPES.KING, 'white');
        initialBoard[7][5] = createPiece(PIECE_TYPES.BISHOP, 'white');
        initialBoard[7][6] = createPiece(PIECE_TYPES.KNIGHT, 'white');
        initialBoard[7][7] = createPiece(PIECE_TYPES.ROOK, 'white');
        for (let c = 0; c < COLS; c++) initialBoard[6][c] = createPiece(PIECE_TYPES.PAWN, 'white');

        console.log('Initialized board data (before setBoard):', JSON.parse(JSON.stringify(initialBoard)));
        setBoard(initialBoard.map(row => row.map(piece => piece || null)));
        setCurrentPlayer('white');
        setSelectedPieceInfo(null);
        setValidMoveCandidates(new Set());
        setGameOver(false);
    }

    function updateVisibleCellsState() {
        console.log(`[updateVisibleCellsState] Called. Current player: ${currentPlayer}, Board length: ${board.length}`);
        const newVisibleCells = new Set();
        if (board.length === 0) {
            console.warn('[updateVisibleCellsState] Board is empty, cannot calculate visibility.');
            setVisibleCells(newVisibleCells);
            return;
        }
        let processedPieceCount = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = board[r][c];
                if (piece && piece.color === currentPlayer) {
                    processedPieceCount++;
                    const vision = piece.visionRange !== undefined ? piece.visionRange : 1;
                    // console.log(`[updateVisibleCellsState] Processing: ${piece.type} (${piece.color}) at [${r},${c}], vision: ${vision}`); // ログが多すぎる場合はコメントアウト
                    for (let dr = -vision; dr <= vision; dr++) {
                        for (let dc = -vision; dc <= vision; dc++) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                                const cellKeyToAdd = `${nr}-${nc}`;
                                newVisibleCells.add(cellKeyToAdd);
                            }
                        }
                    }
                }
            }
        }
        console.log(`[updateVisibleCellsState] Processed ${processedPieceCount} pieces for ${currentPlayer}.`);
        console.log('[updateVisibleCellsState] Final newVisibleCells (before setVisibleCells):', new Set(newVisibleCells), 'Size:', newVisibleCells.size);
        setVisibleCells(newVisibleCells);
    }

    function updateTurnIndicatorContent() {
        setTurnIndicator(`手番: ${currentPlayer === 'white' ? '白 (♙)' : '黒 (♟︎)'}`);
    }

    function handleCellClick(r, c) {
        if (gameOver) return;
        console.log(`Cell clicked: ${r}, ${c}`);
        setMessage(`クリック: ${COL_CHARS[c]}${ROWS-r}`);
    }

    const handleReset = () => {
        initializeBoardState();
    };

    return (
        <div className="bg-gray-900 text-white flex flex-col items-center min-h-screen p-4">
            <div className="text-center mb-4">
                <h1 className="text-3xl font-bold">フォグ・オブ・ウォー チェス</h1>
                <div id="message-area" className="text-lg font-semibold h-6 text-blue-400">{message}</div>
                <div id="turn-indicator" className="text-xl font-bold mt-1">{turnIndicator}</div>
            </div>

            <div id="game-layout-wrapper" className="flex justify-center w-full">
                <div
                    id="game-board-layout"
                    className="inline-grid gap-px" // gap-0.5 から gap-px (1px) に変更、または gap-0
                    style={{
                        // gridTemplateColumns: 'auto repeat(8, minmax(0, 1fr)) auto', // ラベルの幅を内容に合わせ、盤面は等分
                        // gridTemplateRows: 'auto repeat(8, minmax(0, 1fr)) auto',
                        // よりシンプルなグリッド定義: ラベルと盤面をアイテムとして配置
                        gridTemplateAreas: `
                            ". top ."
                            "left board right"
                            ". bottom ."
                        `,
                        gridTemplateColumns: 'auto 1fr auto', // 左ラベル、盤面(可変)、右ラベル
                        gridTemplateRows: 'auto 1fr auto',    // 上ラベル、盤面(可変)、下ラベル
                        // 盤面の最大幅を指定して、極端に引き伸ばされるのを防ぐ (必要に応じて調整)
                        // maxWidth: 'calc(50px * 8 + 2px * 7 + 2rem)', // セルサイズ * 8 + ギャップ * 7 + パディングなど
                    }}
                >
                    {/* 1行目: 上部ラベル */}
                    <div style={{ gridArea: 'top' }} className="grid grid-cols-8">
                        {COL_CHARS.map(char => <div key={`top-${char}`} className="label-cell justify-center items-center flex">{char}</div>)}
                    </div>

                    {/* 2行目: 左ラベル */}
                    <div style={{ gridArea: 'left' }} className="grid grid-rows-8 justify-items-center items-center">
                        {Array.from({length: ROWS}, (_, i) => ROWS - i).map(num => <div key={`left-${num}`} className="label-cell justify-center items-center flex">{num}</div>)}
                    </div>

                    {/* 2行目: 盤面 */}
                    <div id="board-wrapper" style={{ gridArea: 'board' }} className="p-0.5 bg-gray-700 rounded-md shadow-lg flex justify-center items-center">
                         {board.length > 0 ? (
                            <Board
                                boardData={board}
                                visibleCells={visibleCells}
                                selectedPieceInfo={selectedPieceInfo}
                                validMoveCandidates={validMoveCandidates}
                                onCellClick={handleCellClick}
                            />
                        ) : (
                            // セルの最小サイズと列数を考慮したプレースホルダーサイズ
                            <div className="flex justify-center items-center" style={{width: 'calc(30px * 8)', height: 'calc(30px * 8)'}}>盤面をロード中...</div>
                        )}
                    </div>

                    {/* 2行目: 右ラベル */}
                    <div style={{ gridArea: 'right' }} className="grid grid-rows-8 justify-items-center items-center">
                         {Array.from({length: ROWS}, (_, i) => ROWS - i).map(num => <div key={`right-${num}`} className="label-cell justify-center items-center flex">{num}</div>)}
                    </div>

                    {/* 3行目: 下部ラベル */}
                     <div style={{ gridArea: 'bottom' }} className="grid grid-cols-8">
                        {COL_CHARS.map(char => <div key={`bottom-${char}`} className="label-cell justify-center items-center flex">{char}</div>)}
                    </div>
                </div>
            </div>

            <button
                id="reset-button"
                onClick={handleReset}
                className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-150 ease-in-out"
            >
                リセット
            </button>
        </div>
    );
}
export default App;
