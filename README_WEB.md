# Webアプリ起動方法

## 起動手順

### 方法1: 両方のサーバーを同時に起動（推奨）

```bash
npm run dev:all
```

このコマンドで、バックエンドサーバー（ポート3000）とフロントエンドサーバー（ポート5173）が同時に起動します。

### 方法2: 個別に起動

**ターミナル1: バックエンドサーバー**
```bash
npm run server
```

**ターミナル2: フロントエンドサーバー**
```bash
npm run web
```

## アクセス

ブラウザで以下のURLを開いてください：
- http://localhost:5173

## トラブルシューティング

### "Failed to fetch" エラーが出る場合

1. **バックエンドサーバーが起動しているか確認**
   ```bash
   # ポート3000でサーバーが起動しているか確認
   netstat -ano | findstr :3000
   ```

2. **サーバーを再起動**
   ```bash
   npm run server
   ```

3. **環境変数の確認**
   - `.env`ファイルに`OPENAI_API_KEY`が設定されているか確認
   - `templates/transfer_template.pdf`が存在するか確認

### ポートが既に使用されている場合

`server.ts`の`PORT`を変更するか、使用中のプロセスを終了してください。

## 必要なファイル

- `input/shaken.pdf` - 車検証（アップロード）
- `input/inkan.pdf` - 印鑑証明書（アップロード）
- `templates/transfer_template.pdf` - テンプレートPDF（事前に配置が必要）









