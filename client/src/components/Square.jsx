// client/src/components/Square.jsx
import React from 'react';
import Piece from './Piece';

// isVisible と playerColor を props で受け取る
const Square = ({ piece, isDark, onClick, isSelected, isLegalMove, isLastMoveSquare, isVisible, playerColor }) => {
  const squareColorClass = isDark ? 'square-dark' : 'square-light';
  const selectedClass = isSelected ? 'selected' : '';
  const legalMoveClass = isLegalMove ? 'legal-move' : '';
  const lastMoveClass = isLastMoveSquare ? 'last-move' : '';
  const visibilityClass = !isVisible ? 'foggy-square' : ''; // 霧クラス

  // isVisible が undefined の場合のフォールバックを追加
  const shouldShowPiece = isVisible === undefined ? true : isVisible;

  return (
    <div
      className={`square ${squareColorClass} ${selectedClass} ${legalMoveClass} ${lastMoveClass} ${visibilityClass}`}
      onClick={shouldShowPiece ? onClick : undefined} // 見えないマスはクリックできないようにする (任意)
    >
      {/* isVisible (または shouldShowPiece) が true の場合のみ駒を表示 */}
      {shouldShowPiece && piece && <Piece type={piece.type} color={piece.color} />}
    </div>
  );
};

export default Square;