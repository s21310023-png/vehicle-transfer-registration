# システム設計書

## 全体アーキテクチャ

```
┌─────────────┐
│  input/     │  PDFファイル投入
│  - shaken   │
│  - inkan    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ PDF→画像変換    │  pdf/convertToImage.ts
│ (300dpi)        │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ OpenAI Vision   │  ocr/vision.ts
│ OCR処理         │  ocr/prompts.ts
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ データ統合      │  data/integrate.ts
│ (JSON構造化)    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ PDFテンプレート │  pdf/fillTemplate.ts
│ 印字             │
└──────┬──────────┘
       │
       ▼
┌─────────────┐
│  output/    │  完成PDF出力
└─────────────┘
```

## モジュール設計

### 1. PDF→画像変換 (`pdf/convertToImage.ts`)

**責務**: PDFを高解像度画像に変換

**技術**:
- `pdf-poppler`: PDF→画像変換（主要実装）
- 代替実装: `pdfjs-dist` + `canvas`（`convertToImageAlternative.ts`）

**処理フロー**:
1. PDFファイルを読み込み
2. 300dpi相当の画像に変換
3. 一時ディレクトリに保存
4. 画像パス配列を返却

### 2. OCR処理 (`ocr/vision.ts`, `ocr/prompts.ts`)

**責務**: 画像から構造化データを抽出

**技術**:
- OpenAI Vision API (GPT-4o)
- プロンプトエンジニアリング

**処理フロー**:
1. 画像をbase64エンコード
2. ドキュメントタイプに応じたプロンプトを取得
3. OpenAI Vision APIを呼び出し
4. JSONレスポンスをパース
5. 型安全なデータ構造で返却

**プロンプト設計**:
- `ocr/prompts.ts`に分離
- 将来的な帳票追加に対応
- 各ドキュメントタイプごとに最適化

### 3. データ統合 (`data/integrate.ts`)

**責務**: OCR結果を統合して申請書用データに変換

**統合ロジック**:
- 名前: 車検証 > 印鑑証明書
- 住所: 車検証 > 印鑑証明書
- 車両情報: 車検証のみ

**バリデーション**:
- 必須項目のチェック
- 不足項目の警告

### 4. PDFテンプレート印字 (`pdf/fillTemplate.ts`)

**責務**: テンプレートPDFにデータを座標指定で印字

**技術**:
- `pdf-lib`: PDF操作
- `@pdf-lib/fontkit`: 日本語フォント埋め込み

**座標指定**:
- `DEFAULT_FIELD_POSITIONS`で定義
- 実際のテンプレートに合わせて調整が必要

**日本語対応**:
- 日本語フォントファイル（.ttf）を用意
- `embedJapaneseFont`関数で埋め込み

## データフロー

### 入力データ

**印鑑証明書OCR結果**:
```typescript
{
  document_type: "inkan",
  name: string | null,
  address: string | null,
  certification_date: string | null
}
```

**車検証OCR結果**:
```typescript
{
  document_type: "shaken",
  name: string | null,
  address: string | null,
  vehicle_number: string | null,
  chassis_number: string | null,
  model: string | null
}
```

### 統合データ

```typescript
{
  owner_name: string,
  owner_address: string,
  vehicle_number: string,
  chassis_number: string,
  model: string
}
```

## エラーハンドリング

### 階層的エラーハンドリング

1. **ファイル読み込みエラー**: 入力ファイルの存在確認
2. **PDF変換エラー**: 代替実装へのフォールバック
3. **OCRエラー**: 複数画像の順次試行
4. **データ統合エラー**: 不足項目の警告
5. **PDF印字エラー**: 詳細なエラーメッセージ

### ログ出力

- 各処理ステップで進捗を表示
- OCR結果をJSON形式で出力
- エラー時は詳細なスタックトレース

## 拡張性設計

### 帳票追加への対応

1. **型定義の追加** (`types.ts`):
   - 新しいOCR結果型を定義
   - `OCRResult`ユニオン型に追加

2. **プロンプトの追加** (`ocr/prompts.ts`):
   - 新しいドキュメントタイプ用プロンプト関数を追加
   - `getPromptByDocumentType`に分岐を追加

3. **データ統合の拡張** (`data/integrate.ts`):
   - 新しい統合ロジックを追加

4. **テンプレートフィールドの追加** (`pdf/fillTemplate.ts`):
   - `TemplateFields`に新しいフィールドを追加
   - 座標を設定

### 設定ファイル対応

将来的に以下の設定を外部化可能:
- フィールド座標設定（JSON）
- OCRプロンプト（外部ファイル）
- 処理フロー設定（YAML/JSON）

## パフォーマンス考慮

### 最適化ポイント

1. **画像変換**: 必要に応じてDPIを調整可能
2. **OCR処理**: 複数画像の並列処理（将来対応）
3. **一時ファイル**: 処理後に自動クリーンアップ
4. **メモリ管理**: 大きなPDFの分割処理

## セキュリティ考慮

1. **APIキー管理**: `.env`ファイルで管理（`.gitignore`に追加）
2. **入力検証**: ファイル形式の検証
3. **パス操作**: `path.join`で安全なパス構築
4. **一時ファイル**: 処理後に確実に削除

## テスト戦略

### 単体テスト

- 各モジュールの独立テスト
- モックを使用したOCR APIテスト
- データ統合ロジックのテスト

### 統合テスト

- エンドツーエンドの処理フローテスト
- 実際のPDFファイルを使用したテスト

## デプロイメント

### 環境要件

- Node.js 18以上
- TypeScript 5.3以上
- OpenAI APIキー

### ビルド

```bash
npm install
npm run build
```

### 実行

```bash
npm start
```

## 今後の改善点

1. **日本語フォントの自動ダウンロード**
2. **GUIインターフェースの追加**
3. **バッチ処理対応**
4. **OCR結果のキャッシュ機能**
5. **複数テンプレート対応**









