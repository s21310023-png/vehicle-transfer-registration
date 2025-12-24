# Viteアプリを起動するスクリプト

Write-Host "Viteアプリを起動します..." -ForegroundColor Green

# プロジェクトディレクトリを探す
$projectPath = $null

# 現在のディレクトリを確認
if (Test-Path "package.json") {
    $projectPath = Get-Location
    Write-Host "現在のディレクトリにプロジェクトが見つかりました: $projectPath" -ForegroundColor Yellow
} else {
    # 一般的な場所を確認
    $searchPaths = @(
        "$env:USERPROFILE\Documents",
        "$env:USERPROFILE\Desktop",
        "$env:USERPROFILE\Projects",
        "$env:USERPROFILE\source\repos"
    )
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $found = Get-ChildItem -Path $path -Filter "package.json" -Recurse -Depth 2 -ErrorAction SilentlyContinue | 
                     Where-Object { $_.FullName -notlike "*node_modules*" } | 
                     Select-Object -First 1
            
            if ($found) {
                $projectPath = $found.DirectoryName
                Write-Host "プロジェクトが見つかりました: $projectPath" -ForegroundColor Yellow
                break
            }
        }
    }
}

if (-not $projectPath) {
    Write-Host "プロジェクトが見つかりませんでした。" -ForegroundColor Red
    Write-Host "プロジェクトのパスを入力してください:" -ForegroundColor Yellow
    $projectPath = Read-Host
}

if (Test-Path $projectPath) {
    Set-Location $projectPath
    
    # package.jsonを確認
    if (Test-Path "package.json") {
        Write-Host "`nプロジェクトディレクトリ: $projectPath" -ForegroundColor Green
        
        # node_modulesが存在するか確認
        if (-not (Test-Path "node_modules")) {
            Write-Host "依存関係をインストールします..." -ForegroundColor Yellow
            npm install
        }
        
        # 開発サーバーを起動
        Write-Host "`n開発サーバーを起動します..." -ForegroundColor Green
        Write-Host "ブラウザで http://localhost:5173/ を開いてください" -ForegroundColor Cyan
        npm run dev
    } else {
        Write-Host "エラー: package.jsonが見つかりません" -ForegroundColor Red
    }
} else {
    Write-Host "エラー: 指定されたパスが存在しません: $projectPath" -ForegroundColor Red
}










