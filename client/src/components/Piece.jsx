// client/src/components/Piece.jsx
import React from 'react';
import { PIECE_SYMBOLS } from '../../../common/chessLogic'; // common からインポート

const Piece = ({ type, color }) => {
  if (!type || !color) return null;
  const symbol = PIECE_SYMBOLS[color]?.[type] || '?';
  const pieceColorClass = color === 'white' ? 'piece-white' : 'piece-black';

  return <span className={`piece ${pieceColorClass}`}>{symbol}</span>;
};

export default Piece;