# 陸運局移転登録申請書自動生成システム

車検証と印鑑証明書から、陸運局の移転登録申請書を自動生成するシステムです。

## 機能

- 📄 **PDF自動処理**: 車検証と印鑑証明書のPDFを自動読み込み
- 🔍 **OCR抽出**: OpenAI Vision APIを使用した高精度なOCR
- ✍️ **自動印字**: テンプレートPDFに座標指定で自動印字
- 📦 **構造化データ**: JSON形式で厳密にデータを抽出

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`env.example`を`.env`にコピーし、OpenAI APIキーを設定してください：

```bash
cp env.example .env
```

`.env`ファイルを編集：
```
OPENAI_API_KEY=your-openai-api-key-here
```

### 3. テンプレートPDFの配置

`templates/`フォルダに移転登録申請書のテンプレートPDFを配置してください：

```
templates/
└── transfer_template.pdf
```

### 4. 入力ファイルの準備

`input/`フォルダに以下のファイルを配置してください：

```
input/
├── shaken.pdf    # 車検証
└── inkan.pdf     # 印鑑証明書
```

## 使用方法

### 開発モード（TypeScript直接実行）

```bash
npm run dev
```

### ビルドして実行

```bash
npm run build
npm start
```

## プロジェクト構造

```
project/
├── input/              # 入力PDF（車検証・印鑑証明書）
├── templates/          # テンプレートPDF
├── output/             # 生成されたPDF出力先
├── ocr/                # OCR関連モジュール
│   ├── vision.ts      # OpenAI Vision API実装
│   └── prompts.ts     # OCRプロンプト定義
├── pdf/                # PDF処理モジュール
│   ├── convertToImage.ts  # PDF→画像変換
│   └── fillTemplate.ts    # テンプレート印字
├── data/               # データ処理
│   └── integrate.ts   # OCR結果統合
├── types.ts            # 型定義
├── index.ts            # メイン処理
├── package.json
├── tsconfig.json
└── .env
```

## 処理フロー

1. **入力確認**: `input/`フォルダから`shaken.pdf`と`inkan.pdf`を読み込み
2. **画像変換**: 各PDFを300dpiの画像に変換
3. **OCR実行**: OpenAI Vision APIで情報を抽出
4. **データ統合**: 車検証と印鑑証明書の情報を統合
5. **PDF生成**: テンプレートにデータを印字して出力

## OCR抽出項目

### 車検証（shaken.pdf）
- 所有者名
- 所有者住所
- 車両番号
- 車台番号
- 車名・型式

### 印鑑証明書（inkan.pdf）
- 氏名
- 住所
- 発行年月日

## カスタマイズ

### フィールド座標の調整

`pdf/fillTemplate.ts`の`DEFAULT_FIELD_POSITIONS`を編集して、実際のテンプレートPDFの座標に合わせてください：

```typescript
const DEFAULT_FIELD_POSITIONS: TemplateFields = {
  owner_name: { x: 100, y: 700, fontSize: 10 },
  owner_address: { x: 100, y: 680, fontSize: 10 },
  // ...
};
```

### 日本語フォントの設定

日本語を正しく表示するには、日本語フォントファイル（.ttf）を用意し、`pdf/fillTemplate.ts`の`embedJapaneseFont`関数を編集してください。

### OCRプロンプトの調整

`ocr/prompts.ts`でOCRプロンプトをカスタマイズできます。

## 注意事項

- OpenAI APIキーが必要です（有料）
- テンプレートPDFの座標は実際のフォームに合わせて調整が必要です
- 日本語フォントを埋め込まない場合、日本語が正しく表示されない可能性があります
- PDF→画像変換には`pdf-poppler`を使用（Windowsでは追加設定が必要な場合があります）

## トラブルシューティング

### PDF変換エラー

`pdf-poppler`が動作しない場合、`sharp`と`pdfjs-dist`を使用する代替実装に変更できます。

### OCR精度が低い

`ocr/prompts.ts`のプロンプトを調整して、より具体的な指示を追加してください。

### 日本語が表示されない

日本語フォントファイルを用意し、`pdf/fillTemplate.ts`でフォントを埋め込む設定を行ってください。

## ライセンス

MIT
