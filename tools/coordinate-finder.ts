/**
 * 座標確認用グリッドPDF生成ツール（90度回転対応）
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';

async function createCoordinateGrid() {
  const templatePath = path.join(process.cwd(), 'templates', 'transfer_template.pdf');
  const outputPath = path.join(process.cwd(), 'output', `grid_rotated_${Date.now()}.pdf`);

  try {
    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    const rotation = firstPage.getRotation().angle;

    console.log(`ページサイズ: ${width} x ${height} ポイント`);
    console.log(`ページ回転: ${rotation}度`);
    console.log('');
    console.log('【90度回転ページの座標説明】');
    console.log('- 画面の横方向 = Y座標（数字が大きいほど右）');
    console.log('- 画面の縦方向 = X座標（数字が大きいほど下）');

    // グリッド線を描画（10pt間隔）
    const gridSize = 10;
    const lineColor = rgb(1, 0, 0);
    const textColor = rgb(0, 0, 1);

    // X座標のグリッド（画面では縦線に見える）
    for (let x = 0; x <= width; x += gridSize) {
      const isMajor = x % 50 === 0;
      firstPage.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        thickness: isMajor ? 0.5 : 0.2,
        color: isMajor ? rgb(1, 0, 0) : rgb(0.8, 0.8, 0.8),
        opacity: isMajor ? 0.7 : 0.4,
      });
      // Xラベル（50pt間隔のみ）
      if (isMajor) {
        firstPage.drawText(`X${Math.round(x)}`, {
          x: x + 2,
          y: 10,
          size: 6,
          font,
          color: textColor,
        });
      }
    }

    // Y座標のグリッド（画面では横線に見える）
    for (let y = 0; y <= height; y += gridSize) {
      const isMajor = y % 50 === 0;
      firstPage.drawLine({
        start: { x: 0, y },
        end: { x: width, y },
        thickness: isMajor ? 0.5 : 0.2,
        color: isMajor ? rgb(1, 0, 0) : rgb(0.8, 0.8, 0.8),
        opacity: isMajor ? 0.7 : 0.4,
      });
      // Yラベル（50pt間隔のみ）
      if (isMajor) {
        firstPage.drawText(`Y${Math.round(y)}`, {
          x: 5,
          y: y + 2,
          size: 6,
          font,
          color: textColor,
        });
      }
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);

    console.log(`\n座標グリッドPDFを生成しました: ${outputPath}`);

  } catch (error) {
    console.error('エラー:', error);
  }
}

createCoordinateGrid();
