/**
 * PDFテンプレートに印字する機能（90度回転対応）
 */

import { PDFDocument, rgb, PDFFont, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TransferData } from '../types';

// 申請種類の型定義
type ApplicationType = 'transfer' | 'new_registration';

// フィールド座標の設定（spacing対応）
interface FieldPosition {
  x: number;
  y: number;
  fontSize?: number;
  spacing?: number;
  label?: string;
}

interface FieldPositions {
  [key: string]: FieldPosition;
}

// 固定フィールドの型定義
interface StaticField {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  spacing?: number;
  label?: string;
}

// 設定ファイルの型定義
interface FieldPositionsConfig {
  description: string;
  page_info: {
    width: number;
    height: number;
    rotation?: number;
    note: string;
  };
  fields: {
    [key: string]: FieldPosition;
  };
  transfer_static_fields?: {
    [key: string]: StaticField;
  };
  new_registration_static_fields?: {
    [key: string]: StaticField;
  };
  instructions: string;
}

/**
 * 設定ファイルから座標を読み込む
 */
async function loadFieldPositions(): Promise<{
  positions: FieldPositions;
  rotation: number;
  transferStaticFields: { [key: string]: StaticField };
  newRegistrationStaticFields: { [key: string]: StaticField };
}> {
  const configPath = path.join(process.cwd(), 'config', 'field-positions.json');
  
  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config: FieldPositionsConfig = JSON.parse(configData);
    
    console.log('座標設定を読み込みました:', configPath);
    return {
      positions: config.fields,
      rotation: config.page_info.rotation || 0,
      transferStaticFields: config.transfer_static_fields || {},
      newRegistrationStaticFields: config.new_registration_static_fields || {},
    };
  } catch (error) {
    console.warn('座標設定ファイルの読み込みに失敗しました。デフォルト値を使用します。');
    return {
      positions: getDefaultFieldPositions(),
      rotation: 90,
      transferStaticFields: {},
      newRegistrationStaticFields: {},
    };
  }
}

/**
 * デフォルトのフィールド座標
 */
function getDefaultFieldPositions(): FieldPositions {
  return {
    old_owner_name: { x: 205, y: 95, fontSize: 12, spacing: 30 },
    old_owner_address: { x: 515, y: 370, fontSize: 10, spacing: 14 },
    old_owner_address_code: { x: 240, y: 90, fontSize: 13, spacing: 17 },
    new_owner_name: { x: 300, y: 95, fontSize: 12, spacing: 30 },
    new_owner_address: { x: 515, y: 130, fontSize: 10, spacing: 14 },
    new_owner_address_code: { x: 340, y: 90, fontSize: 13, spacing: 17 },
    vehicle_number_region: { x: 150, y: 30, fontSize: 24, spacing: 33 },
    vehicle_number_class: { x: 150, y: 165, fontSize: 13, spacing: 17 },
    vehicle_number_kana: { x: 150, y: 230, fontSize: 13, spacing: 17 },
    vehicle_number_digits: { x: 150, y: 265, fontSize: 13, spacing: 17 },
    chassis_number: { x: 150, y: 348, fontSize: 13, spacing: 17 },
  };
}

/**
 * 日本語フォントを埋め込む
 */
async function embedJapaneseFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  pdfDoc.registerFontkit(fontkit);
  
  const fontPath = path.join(process.cwd(), 'fonts', 'NotoSansJP-Regular.otf');
  
  try {
    const fontBytes = await fs.readFile(fontPath);
    const font = await pdfDoc.embedFont(fontBytes);
    return font;
  } catch (error) {
    console.warn('日本語フォントの読み込みに失敗しました。デフォルトフォントを使用します。');
    const { StandardFonts } = await import('pdf-lib');
    return pdfDoc.embedFont(StandardFonts.Helvetica);
  }
}

/**
 * 縦書きテキストを描画（1文字ずつ90度回転）
 */
function drawVerticalText(
  page: any,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  spacing: number,
  rotation: number = 90
) {
  let currentY = y;
  for (const char of text) {
    page.drawText(char, {
      x: x,
      y: currentY,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
      rotate: degrees(rotation),
    });
    currentY += spacing;
  }
}

/**
 * 車両番号を分解
 */
function parseVehicleNumber(vehicleNumber: string): {
  region: string;
  classNumber: string;
  kana: string;
  digits: string;
} {
  // 例: "品川500あ1234" を分解
  const match = vehicleNumber.match(/^(.+?)(\d{3})([あ-んア-ン])(\d{1,4})$/);
  if (match) {
    return {
      region: match[1],
      classNumber: match[2],
      kana: match[3],
      digits: match[4],
    };
  }
  
  // パースできない場合はそのまま返す
  return {
    region: vehicleNumber,
    classNumber: '',
    kana: '',
    digits: '',
  };
}

/**
 * PDFテンプレートにデータを印字
 */
export async function fillTemplate(
  templatePath: string,
  data: TransferData,
  outputPath: string,
  applicationType: ApplicationType = 'transfer'
): Promise<void> {
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  
  const font = await embedJapaneseFont(pdfDoc);
  
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error('テンプレートPDFにページがありません');
  }
  const firstPage = pages[0];
  
  const { positions, rotation, transferStaticFields, newRegistrationStaticFields } = await loadFieldPositions();
  
  // 今日の日付を取得（令和年）
  const today = new Date();
  const reiwaYear = today.getFullYear() - 2018; // 令和は2019年から（2019年=令和1年）
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // 申請種類に応じた固定フィールドを印字
  const staticFields = applicationType === 'transfer' ? transferStaticFields : newRegistrationStaticFields;
  for (const [fieldName, field] of Object.entries(staticFields)) {
    const fontSize = field.fontSize || 12;
    const spacing = field.spacing;
    
    // AUTO_で始まるテキストは自動生成する日付に置換
    let textToPrint = field.text;
    if (field.text === 'AUTO_YEAR') {
      textToPrint = String(reiwaYear);
    } else if (field.text === 'AUTO_MONTH') {
      textToPrint = String(month);
    } else if (field.text === 'AUTO_DAY') {
      textToPrint = String(day);
    }
    
    if (spacing && textToPrint.length > 1) {
      // 縦書き（文字間隔あり）
      drawVerticalText(
        firstPage,
        textToPrint,
        field.x,
        field.y,
        font,
        fontSize,
        spacing,
        rotation
      );
    } else {
      // 単一文字または間隔なし
      firstPage.drawText(textToPrint, {
        x: field.x,
        y: field.y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
        rotate: degrees(rotation),
      });
    }
    console.log(`固定フィールド印字: ${fieldName} = "${textToPrint}" @ (${field.x}, ${field.y})`);
  }
  
  // 車両番号を分解
  const vehicleParts = parseVehicleNumber(data.vehicle_number);
  
  // フィールドとデータのマッピング
  const dataMap: { [key: string]: string } = {
    old_owner_name: data.old_owner_name,
    old_owner_address: data.old_owner_address,
    old_owner_address_code: data.old_owner_address_code,
    old_owner_chome: data.old_owner_chome,      // 旧所有者 丁目
    old_owner_banchi: data.old_owner_banchi,    // 旧所有者 番地
    new_owner_name: data.new_owner_name,
    new_owner_address: data.new_owner_address,
    new_owner_address_code: data.new_owner_address_code,
    new_owner_chome: data.new_owner_chome,      // 新所有者 丁目
    new_owner_banchi: data.new_owner_banchi,    // 新所有者 番地
    vehicle_number_region: vehicleParts.region,
    vehicle_number_class: vehicleParts.classNumber,
    vehicle_number_kana: vehicleParts.kana,
    vehicle_number_digits: vehicleParts.digits,
    chassis_number: data.chassis_number,
    // 追加フィールド（別の位置に同じデータを印字）
    new_owner_name_sub: data.new_owner_name,  // 車検証から読み取った新所有者名
    old_owner_name_sub: data.old_owner_name,  // 印鑑証明書から読み取った旧所有者名
  };
  
  // 各フィールドを印字
  for (const [fieldName, position] of Object.entries(positions)) {
    const value = dataMap[fieldName];
    if (value && position) {
      const fontSize = position.fontSize || 10;
      const spacing = position.spacing || fontSize + 5;
      
      drawVerticalText(
        firstPage,
        value,
        position.x,
        position.y,
        font,
        fontSize,
        spacing,
        rotation
      );
      
      console.log(`印字: ${fieldName} = "${value}" @ (${position.x}, ${position.y})`);
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
  
  console.log(`PDF生成完了: ${outputPath}`);
}

/**
 * フィールド座標をカスタマイズして印字
 */
export async function fillTemplateWithCustomPositions(
  templatePath: string,
  data: Partial<TransferData>,
  outputPath: string,
  customPositions: FieldPositions
): Promise<void> {
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  
  const font = await embedJapaneseFont(pdfDoc);
  
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error('テンプレートPDFにページがありません');
  }
  const firstPage = pages[0];
  
  for (const [fieldName, position] of Object.entries(customPositions)) {
    const value = (data as any)[fieldName];
    if (value) {
      const fontSize = position.fontSize || 10;
      const spacing = position.spacing || fontSize + 5;
      
      drawVerticalText(
        firstPage,
        String(value),
        position.x,
        position.y,
        font,
        fontSize,
        spacing,
        90
      );
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
  
  console.log(`PDF生成完了: ${outputPath}`);
}
