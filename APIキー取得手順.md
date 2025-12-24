# 🔑 OpenAI APIキー取得手順

## ステップ1: OpenAIアカウントの作成/ログイン

1. https://platform.openai.com/ にアクセス
2. アカウントを作成するか、既存のアカウントでログイン

## ステップ2: APIキーの生成

1. ログイン後、右上のプロフィールアイコンをクリック
2. 「API keys」を選択
3. 「Create new secret key」をクリック
4. キーに名前を付ける（例: "陸運局システム"）
5. 「Create secret key」をクリック
6. **重要**: 表示されたAPIキーをコピー（この画面を閉じると二度と表示されません！）
   - 形式: `sk-xxxxxxxxxxxxxxxxxxxxx`

## ステップ3: クレジットの確認

- OpenAI APIは有料サービスです
- アカウントにクレジット（残高）があることを確認してください
- https://platform.openai.com/account/billing で確認できます

## ステップ4: プロジェクトに設定

1. プロジェクトフォルダで `env.example` を `.env` にコピー
2. `.env` ファイルを開く
3. 以下のように設定：

```env
OPENAI_API_KEY=sk-あなたがコピーしたAPIキー
```

**例:**
```env
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

## 注意事項

⚠️ **セキュリティ**
- APIキーは他人に共有しないでください
- `.env`ファイルは`.gitignore`に含まれているので、Gitにはコミットされません
- APIキーが漏洩した場合は、すぐにOpenAIのダッシュボードで削除してください

💰 **料金**
- GPT-4oを使用する場合、画像1枚あたり約$0.01〜$0.03程度かかります
- 使用量は https://platform.openai.com/usage で確認できます

## 確認

設定後、サーバーを起動して動作確認してください：

```powershell
npm run server
```

エラーが出なければ、APIキーの設定は成功です！









