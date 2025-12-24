/**
 * PDFを画像に変換するモジュール
 * pdf-to-imgを使用（Windowsでも動作）
 */

import * as path from 'path';
import * as fs from 'fs/promises';

export interface ConvertOptions {
  dpi?: number;
  outputFormat?: 'png' | 'jpg';
}

/**
 * PDFを画像に変換
 * @param pdfPath PDFファイルのパス
 * @param outputDir 出力ディレクトリ
 * @param options 変換オプション
 * @returns 生成された画像ファイルのパス配列
 */
export async function convertPdfToImages(
  pdfPath: string,
  outputDir: string,
  options: ConvertOptions = {}
): Promise<string[]> {
  const { outputFormat = 'png' } = options;

  // 出力ディレクトリが存在しない場合は作成
  await fs.mkdir(outputDir, { recursive: true });

  const pdfName = path.basename(pdfPath, '.pdf');

  try {
    // pdf-to-imgを動的にインポート（ESM対応）
    const { pdf } = await import('pdf-to-img');

    const pdfBuffer = await fs.readFile(pdfPath);
    const document = await pdf(pdfBuffer, { scale: 2.0 }); // scale: 2.0 で高解像度

    const imageFiles: string[] = [];
    let pageNum = 1;

    for await (const image of document) {
      const outputPath = path.join(outputDir, `${pdfName}-${pageNum}.${outputFormat}`);
      await fs.writeFile(outputPath, image);
      imageFiles.push(outputPath);
      console.log(`  ページ ${pageNum} を変換しました: ${outputPath}`);
      pageNum++;
    }

    if (imageFiles.length === 0) {
      throw new Error('画像ファイルが生成されませんでした');
    }

    console.log(`PDF変換完了: ${imageFiles.length} ページ`);
    return imageFiles;

  } catch (error) {
    console.error(`PDF変換エラー: ${pdfPath}`, error);
    throw new Error(`PDFを画像に変換できませんでした: ${error}`);
  }
}

/**
 * 一時ファイルをクリーンアップ
 */
export async function cleanupTempImages(imagePaths: string[]): Promise<void> {
  for (const imagePath of imagePaths) {
    try {
      await fs.unlink(imagePath);
    } catch (error) {
      console.warn(`一時ファイル削除失敗: ${imagePath}`, error);
    }
  }
}
