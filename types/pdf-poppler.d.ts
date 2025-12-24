/**
 * pdf-poppler型定義
 */
declare module 'pdf-poppler' {
  interface ConvertOptions {
    format?: 'png' | 'jpg';
    out_dir?: string;
    out_prefix?: string;
    page?: number | null;
    scale?: number;
  }

  export function convert(pdfPath: string, options: ConvertOptions): Promise<void>;
}









