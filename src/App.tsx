import React, { useState } from 'react';
import './App.css';

// 申請種類の定義
type ApplicationType = 'transfer' | 'new_registration' | 'temporary_cancellation' | 'export_cancellation' | 'permanent_cancellation' | null;

// 処理ステップの定義
type ProcessStep = 'select' | 'upload' | 'edit' | 'complete';

interface TransferData {
  // 旧所有者（印鑑証明書から）
  old_owner_name: string;
  old_owner_address: string;
  certification_date: string;
  // 新所有者（車検証から）
  new_owner_name: string;
  new_owner_address: string;
  // 車両情報
  vehicle_number: string;
  chassis_number: string;
  model: string;
}

function App() {
  const [applicationType, setApplicationType] = useState<ApplicationType>(null);
  const [step, setStep] = useState<ProcessStep>('select');
  const [showCancellationMenu, setShowCancellationMenu] = useState(false);
  const [shakenFile, setShakenFile] = useState<File | null>(null);
  const [inkanFile, setInkanFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<TransferData | null>(null);
  const [editedData, setEditedData] = useState<TransferData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleShakenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setShakenFile(e.target.files[0]);
    }
  };

  const handleInkanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setInkanFile(e.target.files[0]);
    }
  };

  // OCR実行（編集画面へ）
  const handleOCR = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!applicationType) {
      setError('申請種類を選択してください');
      return;
    }

    if (!shakenFile || !inkanFile) {
      setError('車検証と印鑑証明書の両方を選択してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('shaken', shakenFile);
      formData.append('inkan', inkanFile);
      formData.append('applicationType', applicationType);
      formData.append('ocrOnly', 'true'); // OCRのみ実行

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = '処理に失敗しました';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setOcrResult(data.transferData);
      setEditedData({ ...data.transferData });
      setStep('edit');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
      console.error('エラー詳細:', err);
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('サーバーに接続できません。バックエンドサーバーが起動しているか確認してください。');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // 編集データの更新
  const handleEditChange = (field: keyof TransferData, value: string) => {
    if (editedData) {
      setEditedData({ ...editedData, [field]: value });
    }
  };

  // PDF生成（編集データを使用）
  const handleGeneratePDF = async () => {
    if (!editedData || !applicationType) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferData: editedData,
          applicationType,
        }),
      });

      if (!response.ok) {
        let errorMessage = '処理に失敗しました';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setDownloadUrl(data.pdfUrl);
      setStep('complete');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
      console.error('エラー詳細:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleReset = () => {
    setApplicationType(null);
    setStep('select');
    setShakenFile(null);
    setInkanFile(null);
    setOcrResult(null);
    setEditedData(null);
    setError(null);
    setDownloadUrl(null);
  };

  const handleBackToEdit = () => {
    setStep('edit');
    setDownloadUrl(null);
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🚗 陸運局申請書自動生成システム</h1>
          <p>車検証と印鑑証明書から申請書を自動生成します</p>
        </header>

        {/* ステップ表示 */}
        {applicationType && (
          <div className="step-indicator">
            <div className={`step ${step === 'upload' || step === 'edit' || step === 'complete' ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">アップロード</span>
            </div>
            <div className={`step ${step === 'edit' || step === 'complete' ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">確認・修正</span>
            </div>
            <div className={`step ${step === 'complete' ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">完了</span>
            </div>
          </div>
        )}

        {/* 申請種類選択 */}
        {step === 'select' && !applicationType && (
          <div className="application-type-section">
            <h2>申請種類を選択してください</h2>
            <div className="application-buttons">
              <button
                className="application-button transfer"
                onClick={() => { setApplicationType('transfer'); setStep('upload'); }}
              >
                <span className="button-icon">🔄</span>
                <span className="button-text">移転登録</span>
                <span className="button-desc">所有者の変更（名義変更）</span>
              </button>
              
              <button className="application-button new-registration" disabled>
                <span className="button-icon">✨</span>
                <span className="button-text">新規登録</span>
                <span className="button-desc">準備中</span>
              </button>
              
              <button className="application-button coming-soon" disabled>
                <span className="button-icon">📝</span>
                <span className="button-text">変更登録</span>
                <span className="button-desc">準備中</span>
              </button>
              
              <div className="cancellation-menu-container">
                <button 
                  className="application-button cancellation"
                  onClick={() => setShowCancellationMenu(!showCancellationMenu)}
                >
                  <span className="button-icon">🗑️</span>
                  <span className="button-text">抹消登録</span>
                  <span className="button-desc">一時・輸出・永久抹消</span>
                </button>
                {showCancellationMenu && (
                  <div className="cancellation-submenu">
                    <button
                      className="submenu-button"
                      onClick={() => { setApplicationType('temporary_cancellation'); setStep('upload'); setShowCancellationMenu(false); }}
                    >
                      <span className="submenu-icon">⏸️</span>
                      <span className="submenu-text">一時抹消登録</span>
                    </button>
                    <button
                      className="submenu-button"
                      onClick={() => { setApplicationType('export_cancellation'); setStep('upload'); setShowCancellationMenu(false); }}
                    >
                      <span className="submenu-icon">🚢</span>
                      <span className="submenu-text">輸出抹消仮登録</span>
                    </button>
                    <button
                      className="submenu-button"
                      onClick={() => { setApplicationType('permanent_cancellation'); setStep('upload'); setShowCancellationMenu(false); }}
                    >
                      <span className="submenu-icon">❌</span>
                      <span className="submenu-text">永久抹消登録</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* アップロードステップ */}
        {step === 'upload' && applicationType && (
          <>
            <div className="selected-type">
              <span className="selected-label">選択中の申請:</span>
              <span className="selected-value">
                {applicationType === 'transfer' && '🔄 移転登録'}
                {applicationType === 'new_registration' && '✨ 新規登録'}
                {applicationType === 'temporary_cancellation' && '⏸️ 一時抹消登録'}
                {applicationType === 'export_cancellation' && '🚢 輸出抹消仮登録'}
                {applicationType === 'permanent_cancellation' && '❌ 永久抹消登録'}
              </span>
              <button className="change-type-button" onClick={handleReset}>
                変更
              </button>
            </div>

            <form onSubmit={handleOCR} className="upload-form">
              <div className="file-upload-section">
                <div className="file-upload">
                  <label htmlFor="shaken" className="file-label">
                    <span className="file-icon">📄</span>
                    <span className="file-text">
                      {shakenFile ? shakenFile.name : '車検証を選択 (PDF)'}
                    </span>
                    <input
                      type="file"
                      id="shaken"
                      accept=".pdf"
                      onChange={handleShakenChange}
                      className="file-input"
                    />
                  </label>
                </div>

                <div className="file-upload">
                  <label htmlFor="inkan" className="file-label">
                    <span className="file-icon">🔖</span>
                    <span className="file-text">
                      {inkanFile ? inkanFile.name : '印鑑証明書を選択 (PDF)'}
                    </span>
                    <input
                      type="file"
                      id="inkan"
                      accept=".pdf"
                      onChange={handleInkanChange}
                      className="file-input"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !shakenFile || !inkanFile}
                className="submit-button"
              >
                {loading ? '📖 読み取り中...' : '📖 書類を読み取る'}
              </button>
            </form>
          </>
        )}

        {/* 編集ステップ */}
        {step === 'edit' && editedData && (
          <div className="edit-section">
            <h2>📝 OCR結果の確認・修正</h2>
            <p className="edit-description">
              読み取り結果を確認し、必要に応じて修正してください。
              <span className="edit-highlight">赤字</span>は修正された項目です。
            </p>

            {/* 旧所有者（印鑑証明書から） */}
            <div className="edit-group">
              <h3 className="section-title">📋 旧所有者（印鑑証明書）</h3>
              <div className="edit-field">
                <label>氏名:</label>
                <input
                  type="text"
                  value={editedData.old_owner_name}
                  onChange={(e) => handleEditChange('old_owner_name', e.target.value)}
                  className={editedData.old_owner_name !== ocrResult?.old_owner_name ? 'modified' : ''}
                />
              </div>
              <div className="edit-field">
                <label>住所:</label>
                <input
                  type="text"
                  value={editedData.old_owner_address}
                  onChange={(e) => handleEditChange('old_owner_address', e.target.value)}
                  className={editedData.old_owner_address !== ocrResult?.old_owner_address ? 'modified' : ''}
                />
              </div>
            </div>

            {/* 新所有者（車検証から） */}
            <div className="edit-group">
              <h3 className="section-title">🚗 新所有者（車検証）</h3>
              <div className="edit-field">
                <label>所有者名:</label>
                <input
                  type="text"
                  value={editedData.new_owner_name}
                  onChange={(e) => handleEditChange('new_owner_name', e.target.value)}
                  className={editedData.new_owner_name !== ocrResult?.new_owner_name ? 'modified' : ''}
                />
              </div>
              <div className="edit-field">
                <label>住所:</label>
                <input
                  type="text"
                  value={editedData.new_owner_address}
                  onChange={(e) => handleEditChange('new_owner_address', e.target.value)}
                  className={editedData.new_owner_address !== ocrResult?.new_owner_address ? 'modified' : ''}
                />
              </div>
            </div>

            {/* 車両情報 */}
            <div className="edit-group">
              <h3 className="section-title">🔧 車両情報</h3>
              <div className="edit-field">
                <label>車両番号:</label>
                <input
                  type="text"
                  value={editedData.vehicle_number}
                  onChange={(e) => handleEditChange('vehicle_number', e.target.value)}
                  className={editedData.vehicle_number !== ocrResult?.vehicle_number ? 'modified' : ''}
                />
              </div>
              <div className="edit-field">
                <label>車台番号:</label>
                <input
                  type="text"
                  value={editedData.chassis_number}
                  onChange={(e) => handleEditChange('chassis_number', e.target.value)}
                  className={editedData.chassis_number !== ocrResult?.chassis_number ? 'modified' : ''}
                />
              </div>
              <div className="edit-field">
                <label>車名・型式:</label>
                <input
                  type="text"
                  value={editedData.model}
                  onChange={(e) => handleEditChange('model', e.target.value)}
                  className={editedData.model !== ocrResult?.model ? 'modified' : ''}
                />
              </div>
            </div>

            <div className="edit-actions">
              <button
                onClick={() => setStep('upload')}
                className="back-button"
              >
                ← 戻る
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={loading}
                className="generate-button"
              >
                {loading ? '生成中...' : '📄 申請書を生成'}
              </button>
            </div>
          </div>
        )}

        {/* 完了ステップ */}
        {step === 'complete' && (
          <div className="complete-section">
            <h2>✅ 申請書の生成が完了しました</h2>
            
            <div className="complete-actions">
              {downloadUrl && (
                <button onClick={handleDownload} className="download-button">
                  📥 PDFをダウンロード
                </button>
              )}
              <button onClick={handleBackToEdit} className="edit-again-button">
                ✏️ 内容を修正する
              </button>
              <button onClick={handleReset} className="new-button">
                🆕 新しい申請書を作成
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <footer className="footer">
          <p>⚠️ 注意: 実際の申請前に内容を確認してください。</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
