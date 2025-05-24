// client/src/components/Square.jsx
import React from 'react';
import Piece from './Piece';

const Square = ({ piece, isDark, onClick, isSelected, isLegalMove, isLastMoveSquare }) => {
  const squareColorClass = isDark ? 'square-dark' : 'square-light';
  const selectedClass = isSelected ? 'selected' : '';
  const legalMoveClass = isLegalMove ? 'legal-move' : '';
  const lastMoveClass = isLastMoveSquare ? 'last-move' : '';


  return (
    <div
      className={`square ${squareColorClass} ${selectedClass} ${legalMoveClass} ${lastMoveClass}`}
      onClick={onClick}
    >
      {piece && <Piece type={piece.type} color={piece.color} />}
    </div>
  );
};

export default Square;