// client/src/components/Board.jsx
import React from 'react';
import Cell from './Cell';

const COL_CHARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function Board({ boardData, visibleCells, selectedPieceInfo, validMoveCandidates, onCellClick }) {
    // boardData は 8x8 の駒情報の配列を想定
    // visibleCells は Setオブジェクトで 'row-col' 形式のキーを持つ想定
    // selectedPieceInfo は { piece, row, col } のようなオブジェクトを想定
    // validMoveCandidates は Setオブジェクトで 'row-col' 形式のキーを持つ想定

    return (
        <div className="grid grid-cols-8 gap-0 border-2 border-gray-800 shadow-2xl w-min"> {/* w-min or fixed width based on cell size */}
            {boardData.map((row, rIndex) =>
                row.map((piece, cIndex) => {
                    const cellKey = `<span class="math-inline">\{rIndex\}\-</span>{cIndex}`;
                    const isLight = (rIndex + cIndex) % 2 === 0;
                    const isFoggy = !visibleCells.has(cellKey);
                    const isSelected = selectedPieceInfo && selectedPieceInfo.row === rIndex && selectedPieceInfo.col === cIndex;
                    const isValidMoveCandidate = validMoveCandidates.has(cellKey);

                    return (
                        <Cell
                            key={cellKey}
                            piece={piece}
                            isLight={isLight}
                            isFoggy={isFoggy}
                            isSelected={isSelected}
                            isValidMoveCandidate={isValidMoveCandidate}
                            onClick={() => onCellClick(rIndex, cIndex)}
                        />
                    );
                })
            )}
        </div>
    );
}
export default Board;