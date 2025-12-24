# セットアップガイド

## 1. 必要な環境

- Python 3.8以上
- pip（Pythonパッケージマネージャー）

## 2. インストール手順

### ステップ1: 依存関係のインストール

```bash
pip install -r requirements.txt
```

### ステップ2: 環境変数の設定

1. `env.example`を`.env`にコピーします：

```bash
# Windows (PowerShell)
Copy-Item env.example .env

# Windows (CMD)
copy env.example .env

# Mac/Linux
cp env.example .env
```

2. `.env`ファイルを開き、以下の情報を設定します：

#### メール設定（必須）

```env
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FOLDER=INBOX
```

**Gmailアプリパスワードの取得方法：**

1. Googleアカウントにログイン
2. [セキュリティ](https://myaccount.google.com/security)にアクセス
3. 「2段階認証プロセス」を有効化（まだの場合）
4. 「アプリパスワード」を選択
5. 「メール」と「その他（カスタム名）」を選択
6. アプリ名を入力（例: "Shopify自動化"）
7. 「生成」をクリック
8. 表示された16文字のパスワードをコピーして`.env`の`EMAIL_PASSWORD`に設定

#### Shopify設定（必須）

```env
SHOPIFY_ORDER_EMAIL_FROM=noreply@shopify.com
```

Shopifyから送信されるメールの送信者アドレスを設定します。通常は`noreply@shopify.com`ですが、カスタムドメインを使用している場合は変更してください。

#### 配送業者設定（オプション）

```env
CARRIER=yamato
```

選択可能な値：
- `yamato`: ヤマト運輸
- `sagawa`: 佐川急便
- `japan_post`: 日本郵便

#### API設定（オプション）

配送業者のAPIを使用する場合は、各APIキーを設定します：

```env
# ヤマト運輸
YAMATO_API_KEY=your-yamato-api-key
YAMATO_API_URL=https://api.yamato-transport.co.jp

# 佐川急便
SAGAWA_API_KEY=your-sagawa-api-key
SAGAWA_API_URL=https://api.sagawa-exp.co.jp

# 日本郵便
JAPAN_POST_API_KEY=your-japan-post-api-key
JAPAN_POST_API_URL=https://api.post.japanpost.jp
```

**注意**: APIキーが設定されていない場合、簡易PDF形式の送り状が作成されます。

### ステップ3: ディレクトリの作成

送り状PDFを保存するディレクトリを作成します（自動的に作成されますが、事前に作成することも可能）：

```bash
mkdir shipping_labels
mkdir logs
```

## 3. 実行方法

### 手動実行

```bash
python main.py
```

### 定期実行の設定（Windows タスクスケジューラ）

1. タスクスケジューラを開く（`Win + R` → `taskschd.msc`）
2. 「基本タスクの作成」をクリック
3. 名前: "Shopify自動送り状作成"
4. トリガー: 「ログオン時」または「スケジュール」（例: 毎時）
5. 操作: 「プログラムの開始」
6. プログラム: `python`（または`C:\Python39\python.exe`など、フルパス）
7. 引数: `C:\path\to\main.py`（main.pyのフルパス）
8. 開始: `C:\path\to\project`（プロジェクトのディレクトリ）

### 定期実行の設定（Mac/Linux cron）

```bash
crontab -e
```

以下の行を追加（例: 毎時実行）：

```
0 * * * * cd /path/to/project && /usr/bin/python3 main.py
```

## 4. テスト

### メール解析のテスト

実際のShopifyメールのサンプルを使用してテストできます：

```bash
python test_email_parser.py
```

`test_email_parser.py`のサンプルメール本文を実際のShopifyメールに置き換えてテストしてください。

## 5. トラブルシューティング

### メールが受信できない

- **IMAPが有効か確認**: Gmailの場合、設定 → すべてのメールを転送 → IMAPアクセスを有効化
- **アプリパスワードが正しいか確認**: 通常のパスワードではなく、アプリパスワードを使用してください
- **ファイアウォール設定**: ポート993（IMAP SSL）がブロックされていないか確認

### 注文情報が抽出できない

- **メール形式の確認**: Shopifyのメールテンプレートが変更されていないか確認
- **ログの確認**: `logs/`ディレクトリ内のログファイルを確認
- **手動テスト**: `test_email_parser.py`を使用してメール解析をテスト

### 送り状が作成されない

- **APIキーの確認**: 配送業者のAPIキーが正しく設定されているか確認
- **配送先住所の確認**: 住所情報が正しく抽出されているか確認
- **権限の確認**: 送り状保存ディレクトリへの書き込み権限があるか確認

## 6. カスタマイズ

### メール解析のカスタマイズ

`email_parser.py`の`ShopifyOrderParser`クラスを編集して、Shopifyのメール形式に合わせて調整できます。

### 送り状デザインのカスタマイズ

`shipping_label_creator.py`の`_create_simple_label`メソッドを編集して、送り状のデザインをカスタマイズできます。

### 配送業者APIの実装

各配送業者のAPIドキュメントを参照して、`shipping_label_creator.py`のAPI連携部分を実装してください。


