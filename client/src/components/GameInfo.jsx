// client/src/components/GameInfo.jsx
import React from 'react';
import { COLORS, PIECE_SYMBOLS } from '../../../common/chessLogic';

const CapturedPiecesDisplay = ({ pieces, color }) => {
  if (!pieces || pieces.length === 0) return null;
  return (
    <div className="captured-pieces">
      <p>{color === COLORS.WHITE ? "Black's captures:" : "White's captures:"}</p>
      <div className="captured-list">
        {pieces.map((p, index) => (
          <span key={index} className="captured-piece-symbol">
            {PIECE_SYMBOLS[p.color]?.[p.type] || '?'}
          </span>
        ))}
      </div>
    </div>
  );
};


const GameInfo = ({ currentPlayer, selectedPieceFOV, capturedPieces, gameStatus }) => {
  return (
    <div className="game-info">
      <h2>Info</h2>
      <p>現在の手番: <span className={currentPlayer === COLORS.WHITE ? 'player-white' : 'player-black'}>{currentPlayer.toUpperCase()}</span></p>
      {selectedPieceFOV !== undefined && selectedPieceFOV !== null && (
        <p>視野の広さ: {selectedPieceFOV}</p>
      )}
      <p>Stats: {gameStatus}</p>

      <div className="captured-pieces-container">
        <CapturedPiecesDisplay pieces={capturedPieces[COLORS.BLACK]} color={COLORS.WHITE} /> {/* 白が取った黒駒 */}
        <CapturedPiecesDisplay pieces={capturedPieces[COLORS.WHITE]} color={COLORS.BLACK} /> {/* 黒が取った白駒 */}
      </div>
    </div>
  );
};

export default GameInfo;