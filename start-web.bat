@echo off
echo ========================================
echo フロントエンドサーバー起動
echo ========================================
echo.
echo ポート5173でWebアプリを起動します...
echo ブラウザで http://localhost:5173 を開いてください
echo 停止する場合は Ctrl+C を押してください
echo.

call npm run web

pause









