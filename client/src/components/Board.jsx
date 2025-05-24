// client/src/components/Board.jsx
import React from 'react';
import Square from './Square';

// visibleSquares と playerColor を props で受け取る
const Board = ({ boardState, onSquareClick, selectedPiecePos, legalMoves, lastMove, visibleSquares, playerColor }) => {
  const renderSquare = (row, col) => {
    const piece = boardState[row][col];
    const isDark = (row + col) % 2 === 1;
    const isSelected = selectedPiecePos && selectedPiecePos.row === row && selectedPiecePos.col === col;
    
    // legalMoves が配列であることを保証 (空配列の場合でも .some がエラーにならないように)
    const isLegal = Array.isArray(legalMoves) && legalMoves.some(move => move.row === row && move.col === col);

    let isLast = false;
    if (lastMove && lastMove.from && lastMove.to) { // lastMove とそのプロパティの存在を確認
        if ((lastMove.from.row === row && lastMove.from.col === col) ||
            (lastMove.to.row === row && lastMove.to.col === col) ) {
            isLast = true;
        }
    }
    // マスが見えるかどうか
    // visibleSquares が Set であることを期待。なければデフォルトで見える（または見えない）ようにする
    const isVisible = visibleSquares instanceof Set ? visibleSquares.has(`${row}-${col}`) : true; // visibleSquares が未定義の場合はとりあえず true (見える) に

    return (
      <Square
        key={`${row}-${col}`}
        piece={piece}
        isDark={isDark}
        onClick={() => onSquareClick(row, col)}
        isSelected={isSelected}
        isLegalMove={isLegal} // isLegalMove に修正 (Square.jsx の props 名と合わせる)
        isLastMoveSquare={isLast} // isLastMoveSquare に修正 (Square.jsx の props 名と合わせる)
        isVisible={isVisible}
        playerColor={playerColor}
      />
    );
  };

  // boardState が配列であり、要素も配列であることを確認
  if (!Array.isArray(boardState) || !boardState.every(Array.isArray)) {
    console.error("Board.jsx: boardState is not a valid 2D array", boardState);
    return <div style={{color: 'red', border: '1px solid red', padding: '10px'}}>Error: Invalid boardState!</div>; // エラー表示
  }

  return (
    <div className="board">
      {boardState.map((rowArr, rowIndex) =>
        // rowArr が配列であることを確認
        Array.isArray(rowArr) ? rowArr.map((_, colIndex) => renderSquare(rowIndex, colIndex)) : null
      )}
    </div>
  );
};

export default Board;