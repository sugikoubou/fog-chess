// client/src/components/Cell.jsx
import React from 'react';

function Cell({ piece, isLight, isFoggy, isSelected, isValidMoveCandidate, onClick }) {
    // デバッグ用に一時的に強制的なスタイルを適用
    const debugStyles = {
        border: '2px solid red', // 目立つ赤い枠線
        backgroundColor: 'lightblue', // 明るい青色の背景
        // width: '50px', // index.cssの.cellで指定されているはずなので、通常は不要
        // height: '50px', // index.cssの.cellで指定されているはずなので、通常は不要
    };

    let cellClass = 'cell aspect-square flex justify-center items-center text-3xl relative';
    // 元の背景色クラスは一時的にコメントアウトするか、デバッグスタイルで上書きされることを期待
    // cellClass += isLight ? ' bg-yellow-200' : ' bg-yellow-500';
    // if (isFoggy) cellClass += ' bg-gray-600';
    if (isSelected) cellClass += ' outline outline-3 outline-blue-400 outline-offset-[-3px]';
    

    return (
        <div
            className={cellClass + (isValidMoveCandidate ? ' valid-move-candidate-overlay' : '')}
            onClick={onClick}
            style={debugStyles} // ← デバッグ用スタイルを適用
        >
            {piece && !isFoggy && ( // isFoggyの条件も一時的に外してテストするのもあり
            // {piece && ( // ← isFoggyを一時的に無視する場合
                <span className={piece.color === 'white' ? 'text-gray-100 piece-white' : 'text-gray-800 piece-black'}>
                    {piece.unicode}
                </span>
            )}
             {/* 視野インジケーターや有効移動候補の表示はここに追加 */}
        </div>
    );
}

export default Cell;
