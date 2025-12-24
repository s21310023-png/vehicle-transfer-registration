/**
 * PDFを画像に変換するモジュール（代替実装）
 * pdf-popplerが動作しない場合の代替として、pdfjs-dist + canvasを使用
 * 
 * 注意: この実装を使用する場合は、以下の追加パッケージが必要です:
 * npm install pdfjs-dist canvas
 */

import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * PDFを画像に変換（代替実装）
 * この実装はpdfjs-distを使用します
 */
export async function convertPdfToImagesAlternative(
  pdfPath: string,
  outputDir: string,
  options: { dpi?: number; outputFormat?: 'png' | 'jpg' } = {}
): Promise<string[]> {
  const { dpi = 300, outputFormat = 'png' } = options;

  try {
    // pdfjs-distとcanvasを動的にインポート（オプショナル依存のため）
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
    const { createCanvas } = await import('canvas');

    // 出力ディレクトリが存在しない場合は作成
    await fs.mkdir(outputDir, { recursive: true });

    const pdfName = path.basename(pdfPath, '.pdf');
    const pdfBytes = await fs.readFile(pdfPath);

    // PDFを読み込み
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;

    const imageFiles: string[] = [];
    const scale = dpi / 72; // 72dpi基準でスケール

    // 各ページを画像に変換
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Canvasを作成
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      // ページをレンダリング
      await page.render({
        canvasContext: context as any,
        viewport: viewport,
      }).promise;

      // 画像ファイルとして保存
      const outputPath = path.join(outputDir, `${pdfName}-${pageNum}.${outputFormat}`);
      const buffer = outputFormat === 'png'
        ? canvas.toBuffer('image/png')
        : canvas.toBuffer('image/jpeg');

      await fs.writeFile(outputPath, buffer);
      imageFiles.push(outputPath);
    }

    return imageFiles;
  } catch (error) {
    console.error('代替PDF変換エラー:', error);
    throw new Error(`PDFを画像に変換できませんでした（代替実装）: ${error}`);
  }
}









