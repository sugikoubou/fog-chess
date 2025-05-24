// client/src/components/Cell.jsx
import React from 'react';

function Cell({ piece, isLight, isFoggy, isSelected, isValidMoveCandidate, onClick }) {
    let cellClass = 'cell aspect-square flex justify-center items-center text-3xl relative'; // clamp(30px, 10vw, 50px) は aspect-square で代替可能か検討
    cellClass += isLight ? ' bg-yellow-200' : ' bg-yellow-500'; // light-square, dark-square
    if (isFoggy) cellClass += ' bg-gray-600'; // fog
    if (isSelected) cellClass += ' outline outline-3 outline-blue-400 outline-offset-[-3px]'; // selected
    // valid-move-candidate-overlay は ::after で実装されているので、クラスでON/OFFを親要素に持たせる

    return (
        <div className={cellClass + (isValidMoveCandidate ? ' valid-move-candidate-overlay' : '')} onClick={onClick}>
            {piece && !isFoggy && (
                <span className={piece.color === 'white' ? 'text-gray-100 piece-white' : 'text-gray-800 piece-black'}>
                    {piece.unicode}
                </span>
            )}
             {/* 視野インジケーターや有効移動候補の表示はここに追加 */}
        </div>
    );
}

export default Cell;