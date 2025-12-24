/**
 * OpenAI Vision APIを使用したOCRモジュール
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { OCRResult, InkanOCRResult, ShakenOCRResult } from '../types';
import { getPromptByDocumentType } from './prompts';
import * as dotenv from 'dotenv';

// 環境変数を読み込む（複数のパスを試行）
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env') });

// OpenAIクライアントを遅延初期化
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('環境変数の状態:', {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '設定済み' : '未設定',
        cwd: process.cwd(),
      });
      throw new Error('OPENAI_API_KEYが設定されていません。.envファイルを確認してください。');
    }
    
    console.log('OpenAIクライアントを初期化中...');
    console.log('APIキー（最初の10文字）:', apiKey.substring(0, 10) + '...');
    
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openaiClient;
}

/**
 * 画像ファイルをbase64エンコード
 */
async function encodeImageToBase64(imagePath: string): Promise<string> {
  const imageBuffer = await fs.readFile(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * 画像を90度左回転させ、前処理を適用してbase64エンコード
 * 印鑑証明書用（コントラスト強化・シャープネス・ノイズ除去）
 */
async function encodeImageToBase64WithRotation(imagePath: string): Promise<string> {
  console.log(`  画像を90度左回転＋前処理中: ${imagePath}`);
  const rotatedBuffer = await sharp(imagePath)
    .rotate(-90) // 90度左回転（反時計回り）
    // コントラストとシャープネスを調整
    .modulate({
      brightness: 1.1, // 明るさを少し上げる
      saturation: 0, // グレースケール化
    })
    .sharpen({ // シャープネス強化
      sigma: 1.5,
      m1: 1.0,
      m2: 0.5,
    })
    .normalise() // コントラストを正規化
    .toBuffer();
  return rotatedBuffer.toString('base64');
}

/**
 * 画像に前処理を適用してbase64エンコード
 * 車検証用（コントラスト強化）
 */
async function encodeImageToBase64WithPreprocess(imagePath: string): Promise<string> {
  console.log(`  画像を前処理中: ${imagePath}`);
  const processedBuffer = await sharp(imagePath)
    .modulate({
      brightness: 1.05,
      saturation: 0.8, // 少し彩度を下げる
    })
    .sharpen({
      sigma: 1.2,
      m1: 0.8,
      m2: 0.4,
    })
    .normalise()
    .toBuffer();
  return processedBuffer.toString('base64');
}

/**
 * 画像のMIMEタイプを取得
 */
function getImageMimeType(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'image/png';
  }
}

/**
 * JSON文字列をパース（エラーハンドリング付き）
 */
function parseOCRResponse(responseText: string): OCRResult {
  try {
    // JSONコードブロックを除去
    const cleaned = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // 型チェック
    if (parsed.document_type === 'inkan') {
      return parsed as InkanOCRResult;
    } else if (parsed.document_type === 'shaken') {
      return parsed as ShakenOCRResult;
    } else {
      throw new Error(`未知のdocument_type: ${parsed.document_type}`);
    }
  } catch (error) {
    console.error('OCRレスポンスのパースエラー:', error);
    console.error('レスポンス内容:', responseText);
    throw new Error(`OCR結果のパースに失敗しました: ${error}`);
  }
}

/**
 * 単一画像でOCRを実行
 */
export async function performOCR(
  imagePath: string,
  documentType: 'inkan' | 'shaken'
): Promise<OCRResult> {
  console.log(`OCR実行中: ${imagePath} (${documentType})`);

  try {
    // OpenAIクライアントを取得
    const openai = getOpenAIClient();
    
    // 画像をbase64エンコード（前処理付き）
    // 印鑑証明書: 90度左回転＋コントラスト強化
    // 車検証: コントラスト強化のみ
    let base64Image: string;
    if (documentType === 'inkan') {
      base64Image = await encodeImageToBase64WithRotation(imagePath);
    } else {
      base64Image = await encodeImageToBase64WithPreprocess(imagePath);
    }
    const mimeType = getImageMimeType(imagePath);

    // プロンプトを取得
    const prompt = getPromptByDocumentType(documentType);

    // OpenAI Vision APIを呼び出し
    const jsonPrompt = `${prompt}\n\n必ず以下のJSON形式で返答してください（説明文は不要）:\n{\n  "document_type": "${documentType}",\n  ...\n}`;

    const response = await openai.chat.completions.create({
      model: process.env.OCR_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: jsonPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OCRレスポンスが空です');
    }

    // JSONをパース
    const result = parseOCRResponse(content);
    console.log('OCR結果:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error(`OCRエラー (${imagePath}):`, error);
    throw new Error(`OCR処理に失敗しました: ${error}`);
  }
}

/**
 * 複数画像でOCRを実行（最初の有効な結果を返す）
 */
export async function performOCRMultiple(
  imagePaths: string[],
  documentType: 'inkan' | 'shaken'
): Promise<OCRResult> {
  for (const imagePath of imagePaths) {
    try {
      const result = await performOCR(imagePath, documentType);
      return result;
    } catch (error) {
      console.warn(`画像 ${imagePath} のOCRに失敗、次の画像を試行します:`, error);
      continue;
    }
  }

  throw new Error('すべての画像でOCRに失敗しました');
}
