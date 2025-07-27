// components/transactions/OFX-manager.tsx
"use client";

import { OFXImportProps } from "@/lib/types/transactions";
import { useOFXImport } from "@/hooks/useOFXImport";

// Import step components
import OFXUploadStep from "./steps/OFXUploadStep";
import OFXPreviewStep from "./steps/OFXPreviewStep";
import OFXCategorizationStep from "./steps/OFXCategorizationStep";
import OFXImportingStep from "./steps/OFXImportingStep";
import OFXResultStep from "./steps/OFXResultStep";

export default function EnhancedOFXManager({ accounts, categories, onSuccess, onCancel }: OFXImportProps) {
  const {
    file,
    parsedData,
    previewTransactions,
    categorizationPreview,
    selectedAccountId,
    loading,
    categorizationLoading,
    error,
    step,
    importResult,
    setSelectedAccountId,
    setStep,
    handleFileSelect,
    handleFileUpload,
    toggleTransactionSelection,
    toggleAllTransactions,
    handleCategoryChange,
    handlePreviewCategorization,
    handleImport,
  } = useOFXImport({ onSuccess, onCancel });



  // Loading state for importing
  if (step === "importing") {
    return <OFXImportingStep />;
  }

  // Result state with enhanced summary
  if (step === "result" && importResult) {
    return <OFXResultStep importResult={importResult} onCancel={onCancel} />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enhanced OFX Import</h2>
        <p className="text-gray-600">Upload an OFX file with smart categorization and manual overrides</p>
      </div>
      {/* Step 1: File Upload */}
      {step === "upload" && (
        <OFXUploadStep
          file={file}
          selectedAccountId={selectedAccountId}
          accounts={accounts}
          loading={loading}
          error={error}
          onFileSelect={handleFileSelect}
          onFileUpload={handleFileUpload}
          onAccountSelect={setSelectedAccountId}
          onCancel={onCancel}
        />
      )}

      {/* Step 2: Transaction Preview */}
      {step === "preview" && parsedData && (
        <OFXPreviewStep
          parsedData={parsedData}
          previewTransactions={previewTransactions}
          selectedAccountId={selectedAccountId}
          categorizationLoading={categorizationLoading}
          error={error}
          onTransactionToggle={toggleTransactionSelection}
          onToggleAll={toggleAllTransactions}
          onBack={() => setStep("upload")}
          onCancel={onCancel}
          onPreviewCategorization={handlePreviewCategorization}
        />
      )}

      {/* Step 3: Enhanced Categorization Preview */}
      {step === "categorization" && categorizationPreview && (
        <OFXCategorizationStep
          previewTransactions={previewTransactions}
          categorizationPreview={categorizationPreview}
          categories={categories}
          loading={loading}
          error={error}
          onCategoryChange={handleCategoryChange}
          onBack={() => setStep("preview")}
          onCancel={onCancel}
          onImport={handleImport}
        />
      )}
    </div>
  );
}
