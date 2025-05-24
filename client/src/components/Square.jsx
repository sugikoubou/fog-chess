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

  // 霧の中で表示する駒を決定
  let pieceToShow = null;
  if (isVisible) {
    pieceToShow = piece;
  } else {
    // 霧の中では、自分の駒だけ表示するか、何も表示しないか選べる
    // ここでは、相手の駒は表示せず、自分の駒も基本表示しないが、
    // もし自分の駒が霧の中にあるという特殊な状況なら表示する、というロジックも可能。
    // 今回はシンプルに、霧の中は駒なしとする（もし自分の駒が霧の中ならバグ）
    // pieceToShow = null; (デフォルトで霧の中は駒なし)
    // もし自分の駒だけ霧の中でも表示したい場合:
    // if (piece && piece.color === playerColor) pieceToShow = piece;
  }


  return (
    <div
      className={`square ${squareColorClass} ${selectedClass} ${legalMoveClass} ${lastMoveClass} ${visibilityClass}`}
      onClick={isVisible ? onClick : undefined} // 見えないマスはクリックできないようにする (任意)
    >
      {/* isVisible が true の場合のみ駒を表示、または pieceToShow を使う */}
      {isVisible && piece && <Piece type={piece.type} color={piece.color} />}
      {/* または pieceToShow を使用:
      {pieceToShow && <Piece type={pieceToShow.type} color={pieceToShow.color} />}
      */}
    </div>
  );
};

export default Square;