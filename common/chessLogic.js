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
    fovRange: PIECE_FOV_RANGES[type],
    hasMoved,
  };
}

export function initializeBoard() {
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  let pieceIdCounter = 0;

  const placePiece = (type, color, row, col) => {
    board[row][col] = createPiece(`piece-${pieceIdCounter++}`, type, color, row, col);
  };

  // ポーン
  for (let c = 0; c < BOARD_SIZE; c++) {
    placePiece(PIECE_TYPES.PAWN, COLORS.BLACK, 1, c);
    placePiece(PIECE_TYPES.PAWN, COLORS.WHITE, 6, c);
  }
  // 他の駒の配置 (ルーク、ナイト、ビショップ、クイーン、キング) - 前回と同様
  placePiece(PIECE_TYPES.ROOK, COLORS.BLACK, 0, 0);
  placePiece(PIECE_TYPES.ROOK, COLORS.BLACK, 0, 7);
  placePiece(PIECE_TYPES.ROOK, COLORS.WHITE, 7, 0);
  placePiece(PIECE_TYPES.ROOK, COLORS.WHITE, 7, 7);

  placePiece(PIECE_TYPES.KNIGHT, COLORS.BLACK, 0, 1);
  placePiece(PIECE_TYPES.KNIGHT, COLORS.BLACK, 0, 6);
  placePiece(PIECE_TYPES.KNIGHT, COLORS.WHITE, 7, 1);
  placePiece(PIECE_TYPES.KNIGHT, COLORS.WHITE, 7, 6);

  placePiece(PIECE_TYPES.BISHOP, COLORS.BLACK, 0, 2);
  placePiece(PIECE_TYPES.BISHOP, COLORS.BLACK, 0, 5);
  placePiece(PIECE_TYPES.BISHOP, COLORS.WHITE, 7, 2);
  placePiece(PIECE_TYPES.BISHOP, COLORS.WHITE, 7, 5);

  placePiece(PIECE_TYPES.QUEEN, COLORS.BLACK, 0, 3);
  placePiece(PIECE_TYPES.QUEEN, COLORS.WHITE, 7, 3);

  placePiece(PIECE_TYPES.KING, COLORS.BLACK, 0, 4);
  placePiece(PIECE_TYPES.KING, COLORS.WHITE, 7, 4);

  return board;
}

// --- ヘルパー関数 ---
export function isWithinBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * 指定されたマスが、移動しようとしている駒にとって占有可能か (空か敵の駒)
 * @param {number} targetRow - 対象マスの行
 * @param {number} targetCol - 対象マスの列
 * @param {string} movingPieceColor - 移動する駒の色
 * @param {Array<Array<object|null>>} boardState - 現在の盤面
 * @returns {boolean}
 */
export function canOccupySquare(targetRow, targetCol, movingPieceColor, boardState) {
  if (!isWithinBoard(targetRow, targetCol)) return false;
  const targetPiece = boardState[targetRow][targetCol];
  return !targetPiece || targetPiece.color !== movingPieceColor;
}

// --- 視界ロジック ---

/**
 * 指定されたマスが、ある駒の直接的な視界内にあるかどうかを判定 (遮蔽なし)
 * @param {{row: number, col: number}} targetSquarePos - 対象のマスの座標
 * @param {object} observingPiece - 観測している駒オブジェクト
 * @returns {boolean}
 */
export function isSquareInPieceFOV(targetSquarePos, observingPiece) {
  if (!observingPiece) return false;
  const { row: pieceRow, col: pieceCol } = observingPiece.position;
  const range = observingPiece.fovRange;

  const dr = Math.abs(targetSquarePos.row - pieceRow);
  const dc = Math.abs(targetSquarePos.col - pieceCol);

  return Math.max(dr, dc) <= range;
}

/**
 * 盤上の指定された色の全ての駒を取得
 * @param {string} color - COLORS.WHITE または COLORS.BLACK
 * @param {Array<Array<object|null>>} boardState
 * @returns {Array<object>} 指定された色の駒のリスト
 */
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

/**
 * 指定されたマスが、指定された色のいずれかの駒から視認可能か判定
 * @param {{row: number, col: number}} targetSquarePos - 対象のマスの座標
 * @param {string} observingColor - 観測側の色 (COLORS.WHITE または COLORS.BLACK)
 * @param {Array<Array<object|null>>} boardState - 現在の盤面
 * @returns {boolean}
 */
export function isSquareVisibleToColor(targetSquarePos, observingColor, boardState) {
    const friendlyPieces = getAllPiecesOfColor(observingColor, boardState);
    for (const piece of friendlyPieces) {
        if (isSquareInPieceFOV(targetSquarePos, piece)) {
            return true;
        }
    }
    return false;
}


// --- 移動生成ロジック ---

/**
 * ポーンの合法な移動先を取得
 * @param {object} pawn - ポーンの駒オブジェクト
 * @param {Array<Array<object|null>>} boardState - 現在の盤面
 * @param {object} [lastMove=null] - 直前の相手の動き (アンパッサン用)
 * @returns {Array<{row: number, col: number}>}
 */
export function getPawnMoves(pawn, boardState, lastMove = null) {
  const moves = [];
  const { row, col } = pawn.position;
  const color = pawn.color;
  const direction = color === COLORS.WHITE ? -1 : 1;

  // 1. 前方への移動 (1マス)
  const oneStepForward = { row: row + direction, col: col };
  if (
    isWithinBoard(oneStepForward.row, oneStepForward.col) &&
    !boardState[oneStepForward.row][oneStepForward.col] && // 1マス先が空
    isSquareInPieceFOV(oneStepForward, pawn) // ポーン自身の視界で1マス先が見える
  ) {
    moves.push(oneStepForward);

    // 2. 前方への移動 (初手2マス)
    if (!pawn.hasMoved) {
      const twoStepsForward = { row: row + 2 * direction, col: col };
      if (
        isWithinBoard(twoStepsForward.row, twoStepsForward.col) &&
        !boardState[twoStepsForward.row][twoStepsForward.col] && // 2マス先が空
        // ポーンの前方1マス目と2マス目の両方が、自軍の誰かから視認可能であること
        isSquareVisibleToColor(oneStepForward, pawn.color, boardState) &&
        isSquareVisibleToColor(twoStepsForward, pawn.color, boardState) &&
        // かつ、移動先の2マス目がポーン自身の視界に入っている必要があるか？
        // 今回のルール「視界の外までは動けない」より、移動先は自身の視界内である必要がある。
        // しかし、ポーンのFOV1では2マス先は自身の視界外。
        // 「他の何かしらの駒によってポーンの前方2マスの視界を確保できている場合に限り」というルールを優先し、
        // ポーン自身のFOVで2マス先が見えなくても、他の味方が見ていればOKと解釈。
        // ただし、最終的な移動先(twoStepsForward)は、ルール「視界の外までは動けない」に基づき、
        // 移動するポーン自身の視界範囲内である必要がある。
        // この条件だと、ポーンのFOVが1なので2マス移動はやはり不可。
        //
        // 再度整理：「他の何かしらの駒によってポーンの前方2マスの視界を確保できている」
        // これは「移動の前提条件」。
        // 加えて、「視界の外までは動けない」という基本ルールがポーンにも適用されるなら、
        // ポーンは自身の視界(FOV1)の外には動けない。
        //
        // もし「他の駒が視界を確保していれば、ポーン自身の視界制限を無視して2マス動ける」のであれば、
        // 以下の isSquareInPieceFOV(twoStepsForward, pawn) のチェックは不要になる。
        // ここでは後者の解釈（特別ルールとしてポーン自身の視界制限を無視）で進めてみる。
        // isSquareInPieceFOV(twoStepsForward, pawn) // この行をコメントアウトまたは削除
        true // 上記条件を満たせばOK
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
        targetPiece.color !== color && // 敵の駒がいる
        isSquareInPieceFOV(capMove, pawn) // ポーン自身の視界で攻撃対象マスが見える
      ) {
        moves.push(capMove);
      }
    }
  }

  // 4. アンパッサン (TODO)
  // 条件:
  // - 自ポーンが5段目 (白ならrow=3, 黒ならrow=4) にいる
  // - lastMove が相手ポーンの2マス移動である
  // - lastMove で移動した相手ポーンが、自ポーンの左右どちらかにいる
  // - 移動先 (相手ポーンの1マス後ろ) が空である
  // - 移動先が自ポーンの視界内である
  // - 取られる相手ポーンが自ポーンの視界内である (これは移動先の視界内判定に含まれることが多い)
  if (lastMove && lastMove.piece.type === PIECE_TYPES.PAWN &&
      Math.abs(lastMove.from.row - lastMove.to.row) === 2 && // 相手が2マス移動
      pawn.position.row === lastMove.to.row && // 同じ行にいる
      Math.abs(pawn.position.col - lastMove.to.col) === 1) { // 隣にいる
    const enPassantTargetSquare = { row: lastMove.to.row + direction, col: lastMove.to.col };
    if (isSquareInPieceFOV(enPassantTargetSquare, pawn) && // 移動先が見える
        isSquareInPieceFOV(lastMove.to, pawn) // 取る駒（の位置）が見える
       ) {
      // アンパッサンは特殊な捕獲なので、識別子を付与すると良いかも
      moves.push({ ...enPassantTargetSquare, enPassant: true, capturedPiecePosition: lastMove.to });
    }
  }


  return moves;
}

/**
 * ルークの合法な移動先を取得
 * @param {object} rook - ルークの駒オブジェクト
 * @param {Array<Array<object|null>>} boardState - 現在の盤面
 * @returns {Array<{row: number, col: number}>}
 */
export function getRookMoves(rook, boardState) {
  const moves = [];
  const { row: startRow, col: startCol } = rook.position;
  const color = rook.color;

  const directions = [
    { dr: -1, dc: 0 }, // 上
    { dr: 1, dc: 0 },  // 下
    { dr: 0, dc: -1 }, // 左
    { dr: 0, dc: 1 },  // 右
  ];

  for (const { dr, dc } of directions) {
    for (let i = 1; i < BOARD_SIZE; i++) {
      const currentRow = startRow + dr * i;
      const currentCol = startCol + dc * i;

      if (!isWithinBoard(currentRow, currentCol)) break; // 盤外に出たら終了

      const targetSquarePos = { row: currentRow, col: currentCol };
      if (!isSquareInPieceFOV(targetSquarePos, rook)) break; // ルークの視界外に出たら、その方向は終了

      const pieceAtTarget = boardState[currentRow][currentCol];
      if (pieceAtTarget) {
        if (pieceAtTarget.color !== color) { // 敵の駒
          moves.push(targetSquarePos); // 取れる
        }
        break; // 自分の駒か敵の駒にぶつかったら、その方向は終了
      } else {
        moves.push(targetSquarePos); // 空きマス
      }
    }
  }
  return moves;
}

/**
 * ナイトの合法な移動先を取得
 * @param {object} knight - ナイトの駒オブジェクト
 * @param {Array<Array<object|null>>} boardState - 現在の盤面
 * @returns {Array<{row: number, col: number}>}
 */
export function getKnightMoves(knight, boardState) {
    const moves = [];
    const { row: startRow, col: startCol } = knight.position;
    const color = knight.color;

    const knightMoveOffsets = [
        { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
        { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
        { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
        { dr: 2, dc: -1 }, { dr: 2, dc: 1 },
    ];

    for (const { dr, dc } of knightMoveOffsets) {
        const targetRow = startRow + dr;
        const targetCol = startCol + dc;
        const targetSquarePos = {row: targetRow, col: targetCol};

        if (isWithinBoard(targetRow, targetCol) &&
            isSquareInPieceFOV(targetSquarePos, knight) &&
            canOccupySquare(targetRow, targetCol, color, boardState)) {
            moves.push(targetSquarePos);
        }
    }
    return moves;
}

/**
 * ビショップの合法な移動先を取得
 * @param {object} bishop - ビショップの駒オブジェクト
 * @param {Array<Array<object|null>>} boardState - 現在の盤面
 * @returns {Array<{row: number, col: number}>}
 */
export function getBishopMoves(bishop, boardState) {
  const moves = [];
  const { row: startRow, col: startCol } = bishop.position;
  const color = bishop.color;

  const directions = [
    { dr: -1, dc: -1 }, // 左上
    { dr: -1, dc: 1 },  // 右上
    { dr: 1, dc: -1 },  // 左下
    { dr: 1, dc: 1 },   // 右下
  ];

  for (const { dr, dc } of directions) {
    for (let i = 1; i < BOARD_SIZE; i++) {
      const currentRow = startRow + dr * i;
      const currentCol = startCol + dc * i;

      if (!isWithinBoard(currentRow, currentCol)) break;

      const targetSquarePos = { row: currentRow, col: currentCol };
      if (!isSquareInPieceFOV(targetSquarePos, bishop)) break;

      const pieceAtTarget = boardState[currentRow][currentCol];
      if (pieceAtTarget) {
        if (pieceAtTarget.color !== color) {
          moves.push(targetSquarePos);
        }
        break;
      } else {
        moves.push(targetSquarePos);
      }
    }
  }
  return moves;
}

/**
 * クイーンの合法な移動先を取得 (ルークとビショップの動きを組み合わせる)
 * @param {object} queen - クイーンの駒オブジェクト
 * @param {Array<Array<object|null>>} boardState - 現在の盤面
 * @returns {Array<{row: number, col: number}>}
 */
export function getQueenMoves(queen, boardState) {
  // ルークとしての動きとビショップとしての動きを合成
  // ただし、視界範囲はクイーン自身のもの(PIECE_FOV_RANGES.QUEEN)を使う必要がある
  // getRookMoves と getBishopMoves を直接呼び出すと、それぞれの駒のFOVで計算してしまうので注意

  const moves = [];
  const { row: startRow, col: startCol } = queen.position;
  const color = queen.color;

  const directions = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }, // Rook directions
    { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }  // Bishop directions
  ];

  for (const { dr, dc } of directions) {
    for (let i = 1; i < BOARD_SIZE; i++) {
      const currentRow = startRow + dr * i;
      const currentCol = startCol + dc * i;

      if (!isWithinBoard(currentRow, currentCol)) break;

      const targetSquarePos = { row: currentRow, col: currentCol };
      // クイーン自身の視界で判定
      if (!isSquareInPieceFOV(targetSquarePos, queen)) break;

      const pieceAtTarget = boardState[currentRow][currentCol];
      if (pieceAtTarget) {
        if (pieceAtTarget.color !== color) {
          moves.push(targetSquarePos);
        }
        break;
      } else {
        moves.push(targetSquarePos);
      }
    }
  }
  return moves;
}

/**
 * キングの合法な移動先を取得
 * @param {object} king - キングの駒オブジェクト
 * @param {Array<Array<object|null>>} boardState - 現在の盤面
 * @returns {Array<{row: number, col: number}>}
 */
export function getKingMoves(king, boardState) {
  const moves = [];
  const { row: startRow, col: startCol } = king.position;
  const color = king.color;

  const kingMoveOffsets = [
    { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },                     { dr: 0, dc: 1 },
    { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 },
  ];

  for (const { dr, dc } of kingMoveOffsets) {
    const targetRow = startRow + dr;
    const targetCol = startCol + dc;
    const targetSquarePos = {row: targetRow, col: targetCol};

    if (isWithinBoard(targetRow, targetCol) &&
        isSquareInPieceFOV(targetSquarePos, king) &&
        canOccupySquare(targetRow, targetCol, color, boardState)
        // 自殺手OKなので、相手の攻撃範囲かどうかはチェックしない
        ) {
      moves.push(targetSquarePos);
    }
  }

  // TODO: キャスリング (視界ルールとキャスリングの組み合わせを定義する必要あり)
  // キングが動いていない、ルークが動いていない、間が空いている、通過マスが攻撃されていない etc.
  // 通過マスが「自軍の誰かから見えている」必要があるか？
  // 現時点では省略。

  return moves;
}


/**
 * 指定された駒の全ての合法な移動先を取得する
 * @param {object} piece - 駒オブジェクト
 * @param {Array<Array<object|null>>} boardState - 現在の盤面
 * @param {object} [lastMove=null] - 直前の相手の動き (アンパッサン用)
 * @returns {Array<{row: number, col: number}>}
 */
export function getLegalMovesForPiece(piece, boardState, lastMove = null) {
  if (!piece) return [];

  switch (piece.type) {
    case PIECE_TYPES.PAWN:
      return getPawnMoves(piece, boardState, lastMove);
    case PIECE_TYPES.ROOK:
      return getRookMoves(piece, boardState);
    case PIECE_TYPES.KNIGHT:
      return getKnightMoves(piece, boardState);
    case PIECE_TYPES.BISHOP:
      return getBishopMoves(piece, boardState);
    case PIECE_TYPES.QUEEN:
      return getQueenMoves(piece, boardState);
    case PIECE_TYPES.KING:
      return getKingMoves(piece, boardState);
    default:
      return [];
  }
  // 自殺手OK、チェック判定なしなので、これ以上のフィルターは不要
}

/**
 * ゲームが終了したかどうかを判定 (キングが取られたら)
 * @param {Array<Array<object|null>>} boardState
 * @returns {string|null} 'white_wins', 'black_wins', or null
 */
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

    if (!whiteKingFound) return `${COLORS.BLACK}_wins`; // 白キングがいない -> 黒の勝ち
    if (!blackKingFound) return `${COLORS.WHITE}_wins`; // 黒キングがいない -> 白の勝ち
    return null; // ゲーム続行
}

/**
 * 手を盤面に適用する
 * @param {Array<Array<object|null>>} board - 現在の盤面 (ディープコピーされたものを渡す想定)
 * @param {object} pieceToMove - 移動する駒
 * @param {{row: number, col: number}} toPos - 移動先の座標
 * @param {string|null} [promotionPieceType=null] - ポーンの昇格先の駒タイプ (例: PIECE_TYPES.QUEEN)
 * @returns {Array<Array<object|null>>} 更新された盤面
 */
export function applyMove(board, pieceToMove, toPos, promotionPieceType = null) {
    const newBoard = board.map(row => row.slice()); //簡易的なディープコピー
    const { row: fromRow, col: fromCol } = pieceToMove.position;

    let movedPiece = { ...pieceToMove, position: toPos, hasMoved: true };

    // ポーンの昇格
    if (movedPiece.type === PIECE_TYPES.PAWN) {
        if ((movedPiece.color === COLORS.WHITE && toPos.row === 0) ||
            (movedPiece.color === COLORS.BLACK && toPos.row === BOARD_SIZE - 1)) {
            if (promotionPieceType) {
                movedPiece.type = promotionPieceType;
                movedPiece.fovRange = PIECE_FOV_RANGES[promotionPieceType];
                // シンボルなどはUI側で対応
            } else {
                // UI側で昇格先を選択させる想定。ここではデフォルトでクイーンにするか、エラー。
                // もしくは、この関数呼び出し前に昇格先を確定させる。
                // 例としてクイーンに昇格
                movedPiece.type = PIECE_TYPES.QUEEN;
                movedPiece.fovRange = PIECE_FOV_RANGES[PIECE_TYPES.QUEEN];
            }
        }
    }
    
    // アンパッサンでの駒の除去
    if (pieceToMove.type === PIECE_TYPES.PAWN &&
        toPos.col !== fromCol && // 斜めに移動し
        !newBoard[toPos.row][toPos.col] // かつ移動先が空マス (アンパッサンの特徴)
       ) {
        const capturedPawnRow = fromRow; // 取られるポーンは元のポーンと同じ行にいる
        const capturedPawnCol = toPos.col; // 取られるポーンは移動先の列にいる
        newBoard[capturedPawnRow][capturedPawnCol] = null;
    }


    newBoard[fromRow][fromCol] = null;
    newBoard[toPos.row][toPos.col] = movedPiece;

    return newBoard;
}