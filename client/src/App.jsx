// App.jsx
import React, { useState, useEffect } from 'react';
import socket from './socketService'; // 作成したsocketインスタンスをインポート

function App() {
    // ... state ...

    useEffect(() => {
        // サーバーからのイベントをリッスン
        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('gameStart', (initialGameData) => {
            // ゲーム開始時の処理 (プレイヤーの色、初期盤面など)
            // setBoard(initialGameData.board);
            // setCurrentPlayer(initialGameData.currentPlayer);
            // ...
        });

        socket.on('opponentMove', (moveData) => {
            // 相手が駒を動かしたときの処理
            // 盤面を更新
            // 手番を更新
        });

        socket.on('updateBoard', (newBoardState, newVisibleCells) => {
            // サーバーから新しい盤面状態と可視セル情報を受け取る
            setBoard(newBoardState);
            setVisibleCells(new Set(newVisibleCells)); // Setに変換
        });

        socket.on('gameOver', (winner) => {
            // ゲーム終了処理
            setGameOver(true);
            // ... メッセージ表示
        });

        return () => {
            // クリーンアップ
            socket.off('connect');
            socket.off('gameStart');
            socket.off('opponentMove');
            socket.off('updateBoard');
            socket.off('gameOver');
        };
    }, []); // 初回レンダリング時のみ実行

    const handleLocalMove = (fromR, fromC, toR, toC) => {
        // 1. 自分の画面で手を仮に反映 (オプション)
        // 2. その手をサーバーに送信
        const moveData = { from: {r: fromR, c: fromC}, to: {r: toR, c: toC} };
        socket.emit('playerMove', moveData);
    };

    // handleCellClick は handleLocalMove を呼び出すように変更
    // ...
}