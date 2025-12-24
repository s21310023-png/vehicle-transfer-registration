/**
 * 申請種類（レ点と選択欄）のテスト印字
 */

import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function testApplicationType() {
  console.log('申請種類テスト印字開始...');
  
  const templatePath = path.join(process.cwd(), 'templates', 'transfer_template.pdf');
  const outputPath = path.join(process.cwd(), 'output', `test_app_type_${Date.now()}.pdf`);

  try {
    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // フォント埋め込み
    pdfDoc.registerFontkit(fontkit);
    const fontPath = path.join(process.cwd(), 'fonts', 'NotoSansJP-Regular.otf');
    const fontBytes = await fs.readFile(fontPath);
    const font = await pdfDoc.embedFont(fontBytes);
    
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // レ点を印字 (x=33, y=180)
    console.log('  レ点: x=33, y=180');
    firstPage.drawText('✓', {
      x: 33,
      y: 180,
      size: 14,
      font: font,
      color: rgb(1, 0, 0), // 赤色で確認しやすく
      rotate: degrees(90),
    });

    // 選択欄に「3」を印字 (x=60, y=145)
    console.log('  選択欄「3」: x=60, y=145');
    firstPage.drawText('3', {
      x: 60,
      y: 145,
      size: 14,
      font: font,
      color: rgb(0, 0, 1), // 青色で確認しやすく
      rotate: degrees(90),
    });

    // 新所有者住所をテスト (x=535, y=80)
    const testAddress = '大阪府大阪市中央区大手前四丁目';
    console.log('  新所有者住所: x=535, y=80');
    let currentY = 80;
    for (const char of testAddress) {
      firstPage.drawText(char, {
        x: 535,
        y: currentY,
        size: 10,
        font: font,
        color: rgb(0, 0.5, 0), // 緑色で確認しやすく
        rotate: degrees(90),
      });
      currentY += 14;
    }

    // 新所有者ラベル (x=510, y=145, size=5, spacing=11)
    const newOwnerName = '鈴木一郎';
    console.log('  新所有者ラベル: x=510, y=145, size=5, spacing=11');
    let newLabelY = 145;
    for (const char of newOwnerName) {
      firstPage.drawText(char, {
        x: 510,
        y: newLabelY,
        size: 5,
        font: font,
        color: rgb(0.5, 0, 0.5), // 紫色
        rotate: degrees(90),
      });
      newLabelY += 11; // 間隔を3狭める（14→11）
    }

    // 旧所有者ラベル (x=500, y=370)
    const oldOwnerName = '山田太郎';
    console.log('  旧所有者ラベル: x=500, y=370');
    let oldLabelY = 370;
    for (const char of oldOwnerName) {
      firstPage.drawText(char, {
        x: 500,
        y: oldLabelY,
        size: 12,
        font: font,
        color: rgb(0.5, 0.5, 0), // 黄土色
        rotate: degrees(90),
      });
      oldLabelY += 14;
    }

    const pdfBytes = await pdfDoc.save();
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, pdfBytes);

    console.log(`完了: ${outputPath}`);
  } catch (error) {
    console.error('エラー:', error);
  }
}

testApplicationType();

