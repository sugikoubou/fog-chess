// common/chessLogic.js

// --- 定数 ---
export const COLORS = { WHITE: 'white', BLACK: 'black' };
export const PIECE_TYPES = {
  PAWN: 'pawn',
  ROOK: 'rook',
  KNIGHT: 'knight',
  BISHOP: 'bishop',
  QUEEN: 'queen',
  KING: 'king',
};

export const PIECE_SYMBOLS = {
  [COLORS.WHITE]: {
    [PIECE_TYPES.PAWN]: '♙',
    [PIECE_TYPES.ROOK]: '♖',
    [PIECE_TYPES.KNIGHT]: '♘',
    [PIECE_TYPES.BISHOP]: '♗',
    [PIECE_TYPES.QUEEN]: '♕',
    [PIECE_TYPES.KING]: '♔',
  },
  [COLORS.BLACK]: {
    [PIECE_TYPES.PAWN]: '♟︎',
    [PIECE_TYPES.ROOK]: '♜',
    [PIECE_TYPES.KNIGHT]: '♞',
    [PIECE_TYPES.BISHOP]: '♝',
    [PIECE_TYPES.QUEEN]: '♛',
    [PIECE_TYPES.KING]: '♚',
  },
};

// 各駒の「視界の範囲」 (getVisibleSquaresForPlayer で使用)
export const PIECE_FOV_RANGES = {
  [PIECE_TYPES.PAWN]: 1,
  [PIECE_TYPES.ROOK]: 3,
  [PIECE_TYPES.KNIGHT]: 2,
  [PIECE_TYPES.BISHOP]: 1,
  [PIECE_TYPES.QUEEN]: 2,
  [PIECE_TYPES.KING]: 1,
};

export const BOARD_SIZE = 8;

// --- データ構造 ---
export function createPiece(id, type, color, row, col, hasMoved = false) {
  return {
    id,
    type,
    color,
    position: { row, col },
    fovRange: PIECE_FOV_RANGES[type], // 駒固有の視界範囲
    hasMoved,
  };
}

export function initializeBoard() {
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  let pieceIdCounter = 0;
  const placePiece = (type, color, row, col) => {
    board[row][col] = createPiece(`piece-${pieceIdCounter++}`, type, color, row, col);
  };
  for (let c = 0; c < BOARD_SIZE; c++) {
    placePiece(PIECE_TYPES.PAWN, COLORS.BLACK, 1, c);
    placePiece(PIECE_TYPES.PAWN, COLORS.WHITE, 6, c);
  }
  placePiece(PIECE_TYPES.ROOK, COLORS.BLACK, 0, 0); placePiece(PIECE_TYPES.ROOK, COLORS.BLACK, 0, 7);
  placePiece(PIECE_TYPES.ROOK, COLORS.WHITE, 7, 0); placePiece(PIECE_TYPES.ROOK, COLORS.WHITE, 7, 7);
  placePiece(PIECE_TYPES.KNIGHT, COLORS.BLACK, 0, 1); placePiece(PIECE_TYPES.KNIGHT, COLORS.BLACK, 0, 6);
  placePiece(PIECE_TYPES.KNIGHT, COLORS.WHITE, 7, 1); placePiece(PIECE_TYPES.KNIGHT, COLORS.WHITE, 7, 6);
  placePiece(PIECE_TYPES.BISHOP, COLORS.BLACK, 0, 2); placePiece(PIECE_TYPES.BISHOP, COLORS.BLACK, 0, 5);
  placePiece(PIECE_TYPES.BISHOP, COLORS.WHITE, 7, 2); placePiece(PIECE_TYPES.BISHOP, COLORS.WHITE, 7, 5);
  placePiece(PIECE_TYPES.QUEEN, COLORS.BLACK, 0, 3); placePiece(PIECE_TYPES.QUEEN, COLORS.WHITE, 7, 3);
  placePiece(PIECE_TYPES.KING, COLORS.BLACK, 0, 4); placePiece(PIECE_TYPES.KING, COLORS.WHITE, 7, 4);
  return board;
}

// --- ヘルパー関数 ---
export function isWithinBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function canOccupySquare(targetRow, targetCol, movingPieceColor, boardState) {
  if (!isWithinBoard(targetRow, targetCol)) return false;
  const targetPiece = boardState[targetRow][targetCol];
  return !targetPiece || targetPiece.color !== movingPieceColor;
}

// --- 視界ロジック ---
// 駒単体の視界範囲を判定 (遮蔽なし)
export function isSquareDirectlyVisibleByPiece(targetSquarePos, observingPiece) {
  if (!observingPiece || !observingPiece.position || observingPiece.fovRange === undefined) {
    return false;
  }
  const { row: pieceRow, col: pieceCol } = observingPiece.position;
  const range = observingPiece.fovRange;
  const dr = Math.abs(targetSquarePos.row - pieceRow);
  const dc = Math.abs(targetSquarePos.col - pieceCol);
  return isWithinBoard(targetSquarePos.row, targetSquarePos.col) && Math.max(dr, dc) <= range;
}

export function getAllPiecesOfColor(color, boardState) {
    const pieces = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const piece = boardState[r][c];
            if (piece && piece.color === color) {
                pieces.push(piece);
            }
        }
    }
    return pieces;
}

// プレイヤー全体の視界を計算
export function getVisibleSquaresForPlayer(boardState, viewingPlayerColor) {
  const visibleSet = new Set();
  if (!viewingPlayerColor) return visibleSet;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const pieceOnSquare = boardState[r][c];
      if (pieceOnSquare && pieceOnSquare.color === viewingPlayerColor) {
        visibleSet.add(`${r}-${c}`); // 自分の駒のいるマスは常に見える
        // その駒からの視界を追加
        for (let tr = 0; tr < BOARD_SIZE; tr++) {
          for (let tc = 0; tc < BOARD_SIZE; tc++) {
            if (isSquareDirectlyVisibleByPiece({ row: tr, col: tc }, pieceOnSquare)) {
              visibleSet.add(`${tr}-${tc}`);
            }
          }
        }
      }
    }
  }
  return visibleSet;
}

// --- 移動生成ロジック ---

export function getPawnMoves(pawn, boardState, lastMove = null, visibleSquares) {
  const moves = [];
  const { row, col } = pawn.position;
  const color = pawn.color;
  const direction = color === COLORS.WHITE ? -1 : 1;

  // 1. 前方への移動 (1マス)
  const oneStepForward = { row: row + direction, col: col };
  if (
    isWithinBoard(oneStepForward.row, oneStepForward.col) &&
    !boardState[oneStepForward.row][oneStepForward.col] &&
    visibleSquares.has(`${oneStepForward.row}-${oneStepForward.col}`) // ★移動先はプレイヤー全体の視界内
  ) {
    moves.push(oneStepForward);

    // 2. 前方への移動 (初手2マス)
    if (!pawn.hasMoved) {
      const twoStepsForward = { row: row + 2 * direction, col: col };
      if (
        isWithinBoard(twoStepsForward.row, twoStepsForward.col) &&
        !boardState[twoStepsForward.row][twoStepsForward.col] && // 2マス先が空
        !boardState[oneStepForward.row][oneStepForward.col] &&   // 1マス先も空 (経路)
        // ★ポーンの初手2マス移動の特例: 経路と移動先がプレイヤー全体の視界内であればOK
        visibleSquares.has(`${oneStepForward.row}-${oneStepForward.col}`) &&
        visibleSquares.has(`${twoStepsForward.row}-${twoStepsForward.col}`)
      ) {
        moves.push(twoStepsForward);
      }
    }
  }

  // 3. 斜め前への攻撃
  const captureMoves = [
    { row: row + direction, col: col - 1 },
    { row: row + direction, col: col + 1 },
  ];
  for (const capMove of captureMoves) {
    if (isWithinBoard(capMove.row, capMove.col)) {
      const targetPiece = boardState[capMove.row][capMove.col];
      if (
        targetPiece &&
        targetPiece.color !== color &&
        visibleSquares.has(`${capMove.row}-${capMove.col}`) // ★攻撃対象マスはプレイヤー全体の視界内
      ) {
        moves.push(capMove);
      }
    }
  }

  // 4. アンパッサン
  if (lastMove && lastMove.piece.type === PIECE_TYPES.PAWN &&
      Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
      pawn.position.row === lastMove.to.row &&
      Math.abs(pawn.position.col - lastMove.to.col) === 1) {
    const enPassantTargetSquare = { row: lastMove.to.row + direction, col: lastMove.to.col };
    const capturedPieceOriginalPos = { row: lastMove.to.row, col: lastMove.to.col };
    if (
      visibleSquares.has(`${enPassantTargetSquare.row}-${enPassantTargetSquare.col}`) && // 移動先が視界内
      visibleSquares.has(`${capturedPieceOriginalPos.row}-${capturedPieceOriginalPos.col}`) // 取る駒がいた場所が視界内
    ) {
      moves.push({ ...enPassantTargetSquare, enPassant: true, capturedPiecePosition: capturedPieceOriginalPos });
    }
  }
  return moves;
}

function getSlidingPieceMoves(piece, boardState, directions, visibleSquares) {
  const moves = [];
  const { row: startRow, col: startCol } = piece.position;
  const color = piece.color;

  for (const { dr, dc } of directions) {
    for (let i = 1; i < BOARD_SIZE; i++) {
      const currentRow = startRow + dr * i;
      const currentCol = startCol + dc * i;

      if (!isWithinBoard(currentRow, currentCol)) break;

      // ★ルール修正: 移動先のマスは、「プレイヤー全体の視界 (visibleSquares)」内である必要がある
      if (!visibleSquares.has(`${currentRow}-${currentCol}`)) {
        // このマスはプレイヤーの視界外なので、これ以上この方向へは進めない。
        // ただし、このマス自体が駒にぶつかるマスで、かつそれが敵駒なら取れる可能性は残る。
        // いや、「視界の外までは移動できない」ので、このマスへの移動も不可。
        break;
      }

      const pieceAtTarget = boardState[currentRow][currentCol];
      if (pieceAtTarget) {
        if (pieceAtTarget.color !== color) { // 敵の駒
          // 敵の駒を取る場合も、そのマスが盤面の視界内である必要がある (上記 visibleSquares.has でチェック済み)
          moves.push({ row: currentRow, col: currentCol });
        }
        break; // 自分の駒か敵の駒にぶつかったら、その方向は終了
      } else { // 空きマス
        moves.push({ row: currentRow, col: currentCol });
      }
    }
  }
  return moves;
}

export function getRookMoves(rook, boardState, visibleSquares) {
  const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },];
  return getSlidingPieceMoves(rook, boardState, directions, visibleSquares);
}

export function getBishopMoves(bishop, boardState, visibleSquares) {
  const directions = [ { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 },];
  return getSlidingPieceMoves(bishop, boardState, directions, visibleSquares);
}

export function getQueenMoves(queen, boardState, visibleSquares) {
  const directions = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
    { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 },
  ];
  return getSlidingPieceMoves(queen, boardState, directions, visibleSquares);
}

export function getKnightMoves(knight, boardState, visibleSquares) {
    const moves = [];
    const { row: startRow, col: startCol } = knight.position;
    const color = knight.color;
    const knightMoveOffsets = [
        { dr: -2, dc: -1 }, { dr: -2, dc: 1 }, { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
        { dr: 1, dc: -2 },  { dr: 1, dc: 2 },  { dr: 2, dc: -1 },  { dr: 2, dc: 1 },
    ];
    for (const { dr, dc } of knightMoveOffsets) {
        const targetRow = startRow + dr;
        const targetCol = startCol + dc;
        if (isWithinBoard(targetRow, targetCol) &&
            canOccupySquare(targetRow, targetCol, color, boardState) &&
            visibleSquares.has(`${targetRow}-${targetCol}`) // ★移動先はプレイヤー全体の視界内
            ) {
            moves.push({row: targetRow, col: targetCol});
        }
    }
    return moves;
}

export function getKingMoves(king, boardState, visibleSquares) {
  const moves = [];
  const { row: startRow, col: startCol } = king.position;
  const color = king.color;
  const kingMoveOffsets = [
    { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },                     { dr: 0, dc: 1 },
    { dr: 1, dc: -1 },  { dr: 1, dc: 0 },  { dr: 1, dc: 1 },
  ];
  for (const { dr, dc } of kingMoveOffsets) {
    const targetRow = startRow + dr;
    const targetCol = startCol + dc;
    if (isWithinBoard(targetRow, targetCol) &&
        canOccupySquare(targetRow, targetCol, color, boardState) &&
        visibleSquares.has(`${targetRow}-${targetCol}`) // ★移動先はプレイヤー全体の視界内
        ) {
      moves.push({row: targetRow, col: targetCol});
    }
  }
  return moves;
}

export function getLegalMovesForPiece(piece, boardState, lastMove = null, visibleSquares, viewingPlayerColor) {
  if (!piece || !visibleSquares) return []; // visibleSquares がない場合は空を返す
  // viewingPlayerColor は getVisibleSquaresForPlayer で使用済み
  switch (piece.type) {
    case PIECE_TYPES.PAWN:
      return getPawnMoves(piece, boardState, lastMove, visibleSquares);
    case PIECE_TYPES.ROOK:
      return getRookMoves(piece, boardState, visibleSquares);
    case PIECE_TYPES.KNIGHT:
      return getKnightMoves(piece, boardState, visibleSquares);
    case PIECE_TYPES.BISHOP:
      return getBishopMoves(piece, boardState, visibleSquares);
    case PIECE_TYPES.QUEEN:
      return getQueenMoves(piece, boardState, visibleSquares);
    case PIECE_TYPES.KING:
      return getKingMoves(piece, boardState, visibleSquares);
    default:
      return [];
  }
}

// applyMove, checkGameOver は変更なし
export function applyMove(board, pieceToMove, toPos, promotionPieceType = null) {
    const newBoard = board.map(row => row.slice());
    const { row: fromRow, col: fromCol } = pieceToMove.position;
    let movedPiece = { ...pieceToMove, position: toPos, hasMoved: true };
    if (movedPiece.type === PIECE_TYPES.PAWN) {
        if ((movedPiece.color === COLORS.WHITE && toPos.row === 0) ||
            (movedPiece.color === COLORS.BLACK && toPos.row === BOARD_SIZE - 1)) {
            if (promotionPieceType && PIECE_FOV_RANGES[promotionPieceType] !== undefined) {
                movedPiece.type = promotionPieceType;
                movedPiece.fovRange = PIECE_FOV_RANGES[promotionPieceType];
            } else {
                movedPiece.type = PIECE_TYPES.QUEEN;
                movedPiece.fovRange = PIECE_FOV_RANGES[PIECE_TYPES.QUEEN];
            }
        }
    }
    if (pieceToMove.type === PIECE_TYPES.PAWN && toPos.col !== fromCol && !newBoard[toPos.row][toPos.col]) {
        const capturedPawnRow = fromRow;
        const capturedPawnCol = toPos.col;
        newBoard[capturedPawnRow][capturedPawnCol] = null;
    }
    newBoard[fromRow][fromCol] = null;
    newBoard[toPos.row][toPos.col] = movedPiece;
    return newBoard;
}

export function checkGameOver(boardState) {
    let whiteKingFound = false;
    let blackKingFound = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const piece = boardState[r][c];
            if (piece && piece.type === PIECE_TYPES.KING) {
                if (piece.color === COLORS.WHITE) whiteKingFound = true;
                if (piece.color === COLORS.BLACK) blackKingFound = true;
            }
        }
    }
    if (!whiteKingFound) return `${COLORS.BLACK}_wins`;
    if (!blackKingFound) return `${COLORS.WHITE}_wins`;
    return null;
}
