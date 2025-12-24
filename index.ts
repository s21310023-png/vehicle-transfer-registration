/**
 * メイン処理
 * 車検証と印鑑証明書から移転登録申請書を自動生成
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { convertPdfToImages, cleanupTempImages } from './pdf/convertToImage';
import { performOCRMultiple } from './ocr/vision';
import { fillTemplate } from './pdf/fillTemplate';
import { integrateOCRResults } from './data/integrate';
import { InkanOCRResult, ShakenOCRResult } from './types';

// 環境変数を読み込み
dotenv.config();

const INPUT_DIR = process.env.INPUT_DIR || './input';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';
const TEMPLATE_DIR = process.env.TEMPLATE_DIR || './templates';
const TEMPLATE_FILE = process.env.TEMPLATE_FILE || 'transfer_template.pdf';

/**
 * メイン処理
 */
async function main() {
  console.log('=== 陸運局移転登録申請書自動生成システム ===\n');

  try {
    // 1. 入力ファイルの確認
    const shakenPath = path.join(INPUT_DIR, 'shaken.pdf');
    const inkanPath = path.join(INPUT_DIR, 'inkan.pdf');
    const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_FILE);

    console.log('入力ファイル確認中...');
    await fs.access(shakenPath);
    await fs.access(inkanPath);
    await fs.access(templatePath);
    console.log('✓ すべてのファイルが見つかりました\n');

    // 2. PDFを画像に変換
    console.log('PDFを画像に変換中...');
    const tempImageDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempImageDir, { recursive: true });

    const shakenImages = await convertPdfToImages(shakenPath, tempImageDir, { dpi: 300 });
    const inkanImages = await convertPdfToImages(inkanPath, tempImageDir, { dpi: 300 });

    console.log(`✓ 車検証: ${shakenImages.length}ページ`);
    console.log(`✓ 印鑑証明書: ${inkanImages.length}ページ\n`);

    // 3. OCR実行
    console.log('OCR実行中...');
    const shakenOCR = await performOCRMultiple(shakenImages, 'shaken') as ShakenOCRResult;
    console.log('✓ 車検証OCR完了\n');

    const inkanOCR = await performOCRMultiple(inkanImages, 'inkan') as InkanOCRResult;
    console.log('✓ 印鑑証明書OCR完了\n');

    // OCR結果を表示
    console.log('=== OCR結果 ===');
    console.log('【車検証】');
    console.log(JSON.stringify(shakenOCR, null, 2));
    console.log('\n【印鑑証明書】');
    console.log(JSON.stringify(inkanOCR, null, 2));
    console.log('');

    // 4. データ統合
    console.log('データ統合中...');
    const integratedData = integrateOCRResults(inkanOCR, shakenOCR);
    console.log('✓ データ統合完了\n');

    // 5. PDFテンプレートに印字
    console.log('PDFテンプレートに印字中...');
    const outputPath = path.join(OUTPUT_DIR, 'transfer_completed.pdf');
    await fillTemplate(templatePath, integratedData, outputPath);
    console.log('✓ PDF生成完了\n');

    // 6. 一時ファイルをクリーンアップ
    console.log('一時ファイルをクリーンアップ中...');
    await cleanupTempImages([...shakenImages, ...inkanImages]);
    console.log('✓ クリーンアップ完了\n');

    console.log('=== 処理完了 ===');
    console.log(`出力ファイル: ${outputPath}`);

  } catch (error) {
    console.error('\n=== エラー発生 ===');
    console.error(error);
    process.exit(1);
  }
}

// 実行
main();









