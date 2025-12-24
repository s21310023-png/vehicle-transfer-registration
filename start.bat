@echo off
echo ========================================
echo 陸運局移転登録申請書自動生成システム
echo ========================================
echo.

echo [1/3] 依存関係を確認中...
call npm list --depth=0 >nul 2>&1
if errorlevel 1 (
    echo 依存関係をインストール中...
    call npm install
)

echo.
echo [2/3] 環境変数を確認中...
if not exist .env (
    echo 警告: .envファイルが見つかりません
    echo env.exampleを.envにコピーして、OPENAI_API_KEYを設定してください
    pause
)

echo.
echo [3/3] サーバーを起動中...
echo.
echo バックエンドサーバー（ポート3000）とフロントエンドサーバー（ポート5173）を起動します
echo ブラウザで http://localhost:5173 を開いてください
echo.
echo 停止する場合は Ctrl+C を押してください
echo.

call npm run dev:all

pause









