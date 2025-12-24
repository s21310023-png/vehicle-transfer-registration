/**
 * 全フィールド座標テスト
 */
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testAllFields() {
  const templatePath = path.join(process.cwd(), 'templates', 'transfer_template.pdf');
  const outputPath = path.join(process.cwd(), 'output', `test_all_${Date.now()}.pdf`);

  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  
  pdfDoc.registerFontkit(fontkit);
  const fontPath = path.join(process.cwd(), 'fonts', 'NotoSansJP-Regular.otf');
  const fontBytes = await fs.readFile(fontPath);
  const font = await pdfDoc.embedFont(fontBytes);
  
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const fontSize = 24;
  const charSpacing = 33;

  // フィールド定義（住所はフォントサイズ10、間隔も調整）
  const fields = [
    { name: '旧所有者名', text: '山田太郎', x: 205, y: 95, color: rgb(1, 0, 0), size: 12, spacing: 30 },
    { name: '旧所有者住所', text: '東京都渋谷区', x: 515, y: 370, color: rgb(1, 0, 0), size: 10, spacing: 14 },
    { name: '旧所有者住所コード', text: '13113', x: 240, y: 90, color: rgb(1, 0, 0), size: 13, spacing: 17 },
    { name: '新所有者名', text: '鈴木一郎', x: 300, y: 95, color: rgb(0, 0, 1), size: 12, spacing: 30 },
    { name: '新所有者住所', text: '大阪府大阪市', x: 515, y: 130, color: rgb(0, 0, 1), size: 10, spacing: 14 },
    { name: '新所有者住所コード', text: '27128', x: 340, y: 90, color: rgb(0, 0, 1), size: 13, spacing: 17 },
    { name: '車両番号_地名', text: '品川', x: 150, y: 30, color: rgb(0, 0.5, 0), size: 24, spacing: 33 },
    { name: '車両番号_分類', text: '500', x: 150, y: 165, color: rgb(0, 0.5, 0), size: 13, spacing: 17 },
    { name: '車両番号_かな', text: 'あ', x: 150, y: 230, color: rgb(0, 0.5, 0), size: 13, spacing: 17 },
    { name: '車両番号_番号', text: '1234', x: 150, y: 265, color: rgb(0, 0.5, 0), size: 13, spacing: 17 },
    { name: '車台番号', text: 'ABC123456789', x: 150, y: 348, color: rgb(0, 0.5, 0), size: 13, spacing: 17 },
  ];

  for (const field of fields) {
    console.log(`${field.name}: "${field.text}" @ x=${field.x}, y=${field.y}, size=${field.size}`);
    
    let currentY = field.y;
    for (const char of field.text) {
      firstPage.drawText(char, {
        x: field.x,
        y: currentY,
        size: field.size,
        font: font,
        color: field.color,
        rotate: degrees(90),
      });
      currentY += field.spacing;
    }
  }

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
  
  console.log(`完了: ${outputPath}`);
}

testAllFields().catch(console.error);
