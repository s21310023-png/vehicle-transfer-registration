/**
 * PDF印字テスト - ページ回転対応版
 */
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testPrint() {
  const templatePath = path.join(process.cwd(), 'templates', 'transfer_template.pdf');
  const outputPath = path.join(process.cwd(), 'output', `test_fixed_${Date.now()}.pdf`);

  console.log('テスト印字開始...');

  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  
  // 日本語フォントを読み込む
  pdfDoc.registerFontkit(fontkit);
  const fontPath = path.join(process.cwd(), 'fonts', 'NotoSansJP-Regular.otf');
  const fontBytes = await fs.readFile(fontPath);
  const font = await pdfDoc.embedFont(fontBytes);
  
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  const rotation = firstPage.getRotation().angle;
  
  console.log(`ページサイズ: ${width} x ${height}`);
  console.log(`ページ回転: ${rotation}度`);

  // テスト文字列
  const testText = 'テスト文字ABC123';
  const fontSize = 10;

  // 回転を考慮した描画
  // ページが90度回転している場合、座標系を調整
  if (rotation === 90 || rotation === -270) {
    console.log('ページが90度回転しています。座標を調整します。');
    
    // 90度回転の場合: 実際のx→画面のy, 実際のy→画面の-x
    // 文字を横に並べるには、yを増やす必要がある
    let currentY = 100;
    const startX = 500;
    const charSpacing = 12;
    
    for (const char of testText) {
      console.log(`  文字 "${char}" を x=${startX}, y=${currentY} に描画`);
      firstPage.drawText(char, {
        x: startX,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(1, 0, 0), // 赤色
      });
      currentY += charSpacing;
    }
  } else {
    console.log('回転なし。通常の座標で描画します。');
    
    let currentX = 100;
    const startY = 500;
    const charSpacing = 12;
    
    for (const char of testText) {
      firstPage.drawText(char, {
        x: currentX,
        y: startY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 1), // 青色
      });
      currentX += charSpacing;
    }
  }

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
  
  console.log(`\n完了: ${outputPath}`);
}

testPrint().catch(console.error);
