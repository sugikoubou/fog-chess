// client/src/components/Board.jsx
import React from 'react';
import Square from './Square';

const Board = ({ boardState, onSquareClick, selectedPiecePos, legalMoves, lastMove }) => {
  const renderSquare = (row, col) => {
    const piece = boardState[row][col];
    const isDark = (row + col) % 2 === 1;
    const isSelected = selectedPiecePos && selectedPiecePos.row === row && selectedPiecePos.col === col;
    const isLegalMove = legalMoves.some(move => move.row === row && move.col === col);

    let isLastMoveSquare = false;
    if (lastMove) {
        if ((lastMove.from.row === row && lastMove.from.col === col) ||
            (lastMove.to.row === row && lastMove.to.col === col) ) {
            isLastMoveSquare = true;
        }
    }


    return (
      <Square
        key={`${row}-${col}`}
        piece={piece}
        isDark={isDark}
        onClick={() => onSquareClick(row, col)}
        isSelected={isSelected}
        isLegalMove={isLegalMove}
        isLastMoveSquare={isLastMoveSquare}
      />
    );
  };

  return (
    <div className="board">
      {boardState.map((rowArr, rowIndex) =>
        rowArr.map((_, colIndex) => renderSquare(rowIndex, colIndex))
      )}
    </div>
  );
};

export default Board;