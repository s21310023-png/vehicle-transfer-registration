/**
 * Express APIサーバー
 * フロントエンドからのリクエストを処理
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
import { convertPdfToImages, cleanupTempImages } from './pdf/convertToImage';
import { performOCRMultiple } from './ocr/vision';
import { fillTemplate } from './pdf/fillTemplate';
import { integrateOCRResults } from './data/integrate';
import { InkanOCRResult, ShakenOCRResult } from './types';

// 環境変数を最初に読み込む
dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// CORS設定
app.use(cors());
app.use(express.json());

// アップロードファイルの設定
const upload = multer({
  dest: 'temp/uploads',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// アップロードディレクトリの作成
async function ensureDirectories() {
  await fs.mkdir('temp/uploads', { recursive: true });
  await fs.mkdir('temp/images', { recursive: true });
  await fs.mkdir('output', { recursive: true });
}

// 申請種類の型定義
type ApplicationType = 'transfer' | 'new_registration' | 'temporary_cancellation' | 'export_cancellation' | 'permanent_cancellation';

// 申請種類に応じたテンプレートを取得
function getTemplatePath(applicationType: ApplicationType): string {
  const cancellationTypes = ['temporary_cancellation', 'export_cancellation', 'permanent_cancellation'];
  if (cancellationTypes.includes(applicationType)) {
    return path.join(process.cwd(), 'templates', 'cancellation_template.pdf');
  }
  return path.join(process.cwd(), 'templates', 'transfer_template.pdf');
}

// APIエンドポイント: PDF処理
app.post('/api/process', upload.fields([
  { name: 'shaken', maxCount: 1 },
  { name: 'inkan', maxCount: 1 },
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const applicationType = req.body.applicationType as ApplicationType;
    
    if (!applicationType) {
      return res.status(400).json({ error: '申請種類が選択されていません' });
    }
    
    if (!files || !files.shaken || !files.inkan) {
      return res.status(400).json({ error: '車検証と印鑑証明書の両方が必要です' });
    }

    const shakenFile = files.shaken[0];
    const inkanFile = files.inkan[0];

    console.log('処理開始:', {
      applicationType,
      shaken: shakenFile.originalname,
      inkan: inkanFile.originalname,
    });

    // 一時ディレクトリの準備
    await ensureDirectories();
    const tempImageDir = path.join(process.cwd(), 'temp/images');

    // 1. PDFを画像に変換
    console.log('PDFを画像に変換中...');
    const shakenImages = await convertPdfToImages(shakenFile.path, tempImageDir, { dpi: 300 });
    const inkanImages = await convertPdfToImages(inkanFile.path, tempImageDir, { dpi: 300 });

    // 2. OCR実行
    console.log('OCR実行中...');
    const shakenOCR = await performOCRMultiple(shakenImages, 'shaken') as ShakenOCRResult;
    const inkanOCR = await performOCRMultiple(inkanImages, 'inkan') as InkanOCRResult;

    // 3. データ統合
    console.log('データ統合中...');
    const integratedData = integrateOCRResults(inkanOCR, shakenOCR);

    // 4. PDFテンプレートに印字
    console.log('PDF生成中...');
    const templatePath = getTemplatePath(applicationType);
    const outputFileName = `${applicationType}_${Date.now()}.pdf`;
    const outputPath = path.join(process.cwd(), 'output', outputFileName);
    
    await fillTemplate(templatePath, integratedData, outputPath, applicationType);

    // 5. 一時ファイルをクリーンアップ
    await cleanupTempImages([...shakenImages, ...inkanImages]);
    await fs.unlink(shakenFile.path);
    await fs.unlink(inkanFile.path);

    // 6. レスポンス
    res.json({
      success: true,
      transferData: integratedData,
      pdfUrl: `/api/download/${outputFileName}`,
      message: '処理が完了しました',
    });

  } catch (error) {
    console.error('処理エラー:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
    });
  }
});

// APIエンドポイント: OCRのみ実行（編集用）
app.post('/api/ocr', upload.fields([
  { name: 'shaken', maxCount: 1 },
  { name: 'inkan', maxCount: 1 },
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.shaken || !files.inkan) {
      return res.status(400).json({ error: '車検証と印鑑証明書の両方が必要です' });
    }

    const shakenFile = files.shaken[0];
    const inkanFile = files.inkan[0];

    console.log('OCR処理開始:', {
      shaken: shakenFile.originalname,
      inkan: inkanFile.originalname,
    });

    // 一時ディレクトリの準備
    await ensureDirectories();
    const tempImageDir = path.join(process.cwd(), 'temp/images');

    // 1. PDFを画像に変換
    console.log('PDFを画像に変換中...');
    const shakenImages = await convertPdfToImages(shakenFile.path, tempImageDir, { dpi: 300 });
    const inkanImages = await convertPdfToImages(inkanFile.path, tempImageDir, { dpi: 300 });

    // 2. OCR実行
    console.log('OCR実行中...');
    const shakenOCR = await performOCRMultiple(shakenImages, 'shaken') as ShakenOCRResult;
    const inkanOCR = await performOCRMultiple(inkanImages, 'inkan') as InkanOCRResult;

    // 3. データ統合
    console.log('データ統合中...');
    const integratedData = integrateOCRResults(inkanOCR, shakenOCR);

    // 4. 一時ファイルをクリーンアップ
    await cleanupTempImages([...shakenImages, ...inkanImages]);
    await fs.unlink(shakenFile.path);
    await fs.unlink(inkanFile.path);

    // 5. OCR結果のみを返す（PDF生成なし）
    res.json({
      success: true,
      transferData: integratedData,
      message: 'OCR処理が完了しました',
    });

  } catch (error) {
    console.error('OCRエラー:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'OCR処理中にエラーが発生しました',
    });
  }
});

// APIエンドポイント: PDF生成（編集データから）
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { transferData, applicationType } = req.body;

    if (!transferData) {
      return res.status(400).json({ error: 'データが指定されていません' });
    }

    console.log('PDF生成開始:', {
      applicationType,
      transferData,
    });

    // 一時ディレクトリの準備
    await ensureDirectories();

    // PDFテンプレートに印字
    const appType = applicationType || 'transfer';
    const templatePath = getTemplatePath(appType);
    const outputFileName = `${appType}_${Date.now()}.pdf`;
    const outputPath = path.join(process.cwd(), 'output', outputFileName);
    
    await fillTemplate(templatePath, transferData, outputPath, appType);

    // レスポンス
    res.json({
      success: true,
      pdfUrl: `/api/download/${outputFileName}`,
      message: 'PDF生成が完了しました',
    });

  } catch (error) {
    console.error('PDF生成エラー:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'PDF生成中にエラーが発生しました',
    });
  }
});

// APIエンドポイント: PDFダウンロード
app.get('/api/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'output', filename);

    // ファイルの存在確認
    await fs.access(filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);

  } catch (error) {
    console.error('ダウンロードエラー:', error);
    res.status(404).json({ error: 'ファイルが見つかりません' });
  }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 本番環境では静的ファイルを配信
if (process.env.NODE_ENV === 'production') {
  // Viteのビルド出力先（dist/）から配信
  const staticPath = path.join(process.cwd(), 'dist');
  app.use(express.static(staticPath));
  
  // SPAのフォールバック（APIルート以外）
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 APIサーバーが起動しました: http://localhost:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('📦 本番モードで実行中');
  }
});

