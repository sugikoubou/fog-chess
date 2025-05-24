// client/src/components/Board.jsx
import React from 'react';
import Square from './Square';

// visibleSquares と playerColor を props で受け取る
const Board = ({ boardState, onSquareClick, selectedPiecePos, legalMoves, lastMove, visibleSquares, playerColor }) => {
  const renderSquare = (row, col) => {
    const piece = boardState[row][col];
    const isDark = (row + col) % 2 === 1;
    const isSelected = selectedPiecePos && selectedPiecePos.row === row && selectedPiecePos.col === col;
    const isLegal = legalMoves.some(move => move.row === row && move.col === col);

    let isLast = false;
    if (lastMove) {
        if ((lastMove.from.row === row && lastMove.from.col === col) ||
            (lastMove.to.row === row && lastMove.to.col === col) ) {
            isLast = true;
        }
    }
    // マスが見えるかどうか
    const isVisible = visibleSquares.has(`${row}-${col}`);

    return (
      <Square
        key={`${row}-${col}`}
        piece={piece}
        isDark={isDark}
        onClick={() => onSquareClick(row, col)}
        isSelected={isSelected}
        isLegalMove={isLegal} // isLegalMove の名前を isLegal に変更した場合はここも修正
        isLastMoveSquare={isLast} // isLastMoveSquare の名前を isLast に変更した場合はここも修正
        isVisible={isVisible}     // isVisible を渡す
        playerColor={playerColor} // playerColor を渡す
      />
    );
  };
  // ...
};
export default Board;