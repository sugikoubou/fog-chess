// client/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // あなたの App.jsx をインポート
import './index.css'; // グローバルなCSSファイルがあればインポート (なければこの行は不要か、App.cssをここでインポートする設計も可)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);