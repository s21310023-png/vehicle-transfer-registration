/**
 * OCR結果を統合して移転登録申請書用データに変換
 */

import { InkanOCRResult, ShakenOCRResult, TransferData } from '../types';
import { getAddressCode, extractAddressDetails } from './address-codes';

/**
 * OCR結果を統合
 * @param inkanResult 印鑑証明書OCR結果（旧所有者）
 * @param shakenResult 車検証OCR結果（新所有者）
 * @returns 統合データ
 */
export function integrateOCRResults(
  inkanResult: InkanOCRResult,
  shakenResult: ShakenOCRResult
): TransferData {
  // 旧所有者（印鑑証明書から）
  const old_owner_name = inkanResult.name || '';
  const old_owner_address = inkanResult.address || '';
  const old_owner_address_code = getAddressCode(old_owner_address); // 住所から自動変換
  const old_address_details = extractAddressDetails(old_owner_address);
  const old_owner_chome = old_address_details.chome;
  const old_owner_banchi = old_address_details.banchi;
  const certification_date = inkanResult.certification_date || '';

  // 新所有者（車検証から）
  const new_owner_name = shakenResult.name || '';
  const new_owner_address = shakenResult.address || '';
  const new_owner_address_code = getAddressCode(new_owner_address); // 住所から自動変換
  const new_address_details = extractAddressDetails(new_owner_address);
  const new_owner_chome = new_address_details.chome;
  const new_owner_banchi = new_address_details.banchi;

  // 車両情報（車検証から）
  const vehicle_number = shakenResult.vehicle_number || '';
  const chassis_number = shakenResult.chassis_number || '';
  const model = shakenResult.model || '';

  const integrated: TransferData = {
    // 旧所有者
    old_owner_name,
    old_owner_address,
    old_owner_address_code,
    old_owner_chome,
    old_owner_banchi,
    certification_date,
    // 新所有者
    new_owner_name,
    new_owner_address,
    new_owner_address_code,
    new_owner_chome,
    new_owner_banchi,
    // 車両情報
    vehicle_number,
    chassis_number,
    model,
  };

  console.log('統合データ:', JSON.stringify(integrated, null, 2));

  // 必須項目のチェック
  const missingFields: string[] = [];
  if (!integrated.old_owner_name) missingFields.push('旧所有者名');
  if (!integrated.old_owner_address) missingFields.push('旧所有者住所');
  if (!integrated.new_owner_name) missingFields.push('新所有者名');
  if (!integrated.new_owner_address) missingFields.push('新所有者住所');
  if (!integrated.vehicle_number) missingFields.push('車両番号');
  if (!integrated.chassis_number) missingFields.push('車台番号');
  if (!integrated.model) missingFields.push('車名・型式');

  if (missingFields.length > 0) {
    console.warn('警告: 以下の項目が不足しています:', missingFields);
  }

  return integrated;
}
