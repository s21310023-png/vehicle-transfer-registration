/**
 * 型定義
 */

// 印鑑証明書OCR結果
export interface InkanOCRResult {
  document_type: "inkan";
  name: string | null;
  address: string | null;
  certification_date: string | null;
}

// 車検証OCR結果
export interface ShakenOCRResult {
  document_type: "shaken";
  name: string | null;
  address: string | null;
  vehicle_number: string | null;
  chassis_number: string | null;
  model: string | null;
}

// OCR結果のユニオン型
export type OCRResult = InkanOCRResult | ShakenOCRResult;

// 統合データ構造（旧所有者・新所有者の両方を含む）
export interface TransferData {
  // 旧所有者（印鑑証明書から）
  old_owner_name: string;
  old_owner_address: string;
  old_owner_address_code: string; // 住所コード
  old_owner_chome: string; // 丁目
  old_owner_banchi: string; // 番地
  certification_date: string;
  // 新所有者（車検証から）
  new_owner_name: string;
  new_owner_address: string;
  new_owner_address_code: string; // 住所コード
  new_owner_chome: string; // 丁目
  new_owner_banchi: string; // 番地
  // 車両情報（車検証から）
  vehicle_number: string;
  chassis_number: string;
  model: string;
}

// PDF印字座標設定
export interface FieldPosition {
  x: number;
  y: number;
  fontSize?: number;
}

// テンプレートフィールドマッピング
export interface TemplateFields {
  old_owner_name: FieldPosition;
  old_owner_address: FieldPosition;
  new_owner_name: FieldPosition;
  new_owner_address: FieldPosition;
  vehicle_number: FieldPosition;
  chassis_number: FieldPosition;
  model: FieldPosition;
}
