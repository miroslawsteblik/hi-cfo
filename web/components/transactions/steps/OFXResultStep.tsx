// components/transactions/steps/OFXResultStep.tsx
"use client";

import { ImportResult } from "@/lib/features/transactions";

interface OFXResultStepProps {
  importResult: ImportResult;
  onCancel: () => void;
}

export default function OFXResultStep({ importResult, onCancel }: OFXResultStepProps) {
  const isAllDuplicates = importResult.imported === 0 && importResult.duplicates?.length > 0;
  const isPartialSuccess = importResult.imported > 0 && (importResult.errors?.length > 0 || importResult.skipped > 0);
  const isComplete = importResult.success && importResult.imported > 0 && (!importResult.errors || importResult.errors.length === 0);
  const isFailure =
    importResult.imported === 0 && 
    (!importResult.duplicates || importResult.duplicates.length === 0) && 
    importResult.errors?.length > 0;

  const getStatusColor = () => {
    if (isComplete) return "bg-green-100";
    if (isAllDuplicates) return "bg-blue-100";
    if (isPartialSuccess) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getIconColor = () => {
    if (isComplete) return "text-green-600";
    if (isAllDuplicates) return "text-blue-600";
    if (isPartialSuccess) return "text-yellow-600";
    return "text-red-600";
  };

  const getButtonColor = () => {
    if (isComplete) return "bg-green-600 hover:bg-green-700";
    if (isAllDuplicates) return "bg-blue-600 hover:bg-blue-700";
    if (isPartialSuccess) return "bg-yellow-600 hover:bg-yellow-700";
    return "bg-red-600 hover:bg-red-700";
  };

  const getTitle = () => {
    if (isComplete) return "Import Complete!";
    if (isAllDuplicates) return "All Transactions Already Exist";
    if (isPartialSuccess) return "Import Partially Complete";
    return "Import Failed";
  };

  const getDescription = () => {
    if (isComplete) return "All new transactions have been successfully imported.";
    if (isAllDuplicates) return "All transactions in this file have already been imported previously. No new transactions were added.";
    if (isPartialSuccess) return "Some transactions were imported successfully, while others were skipped or failed.";
    return "The import process encountered errors and no transactions were imported.";
  };

  const getButtonText = () => {
    if (isComplete) return "Close";
    if (isAllDuplicates) return "Understood";
    if (isPartialSuccess) return "Continue";
    return "Try Again";
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center">
        {/* Status Icon */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${getStatusColor()}`}>
          <svg className={`w-8 h-8 ${getIconColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isComplete ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : isAllDuplicates ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : isPartialSuccess ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.955-.816 2.041-1.857.087-1.044-.814-2.143-1.857-2.143H4.898c-1.043 0-1.944 1.099-1.857 2.143C3.127 15.184 4.028 16 5.082 16z"
              />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            )}
          </svg>
        </div>

        {/* Title */}
        <h3 className={`text-lg font-medium mb-2 ${
          isComplete ? "text-green-900" : 
          isAllDuplicates ? "text-blue-900" : 
          isPartialSuccess ? "text-yellow-900" : 
          "text-red-900"
        }`}>
          {getTitle()}
        </h3>

        {/* Description */}
        <p className="text-gray-600 mb-4">{getDescription()}</p>

        {/* Summary Stats */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="text-center">
              <div className="text-lg font-medium text-green-600">{importResult.imported || 0}</div>
              <div className="text-xs text-gray-500">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-yellow-600">{importResult.skipped || 0}</div>
              <div className="text-xs text-gray-500">Skipped</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-blue-600">{importResult.duplicates?.length || 0}</div>
              <div className="text-xs text-gray-500">Duplicates</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-red-600">{importResult.errors?.length || 0}</div>
              <div className="text-xs text-gray-500">Errors</div>
            </div>
          </div>

          {/* Categorization Summary */}
          {importResult.categorization_summary && importResult.imported > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Categorization Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-medium text-blue-600">{importResult.categorization_summary.auto_categorized}</div>
                  <div className="text-xs text-gray-500">Auto-categorized</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-purple-600">{importResult.categorization_summary.manually_assigned}</div>
                  <div className="text-xs text-gray-500">Manually assigned</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-600">{importResult.categorization_summary.uncategorized}</div>
                  <div className="text-xs text-gray-500">Uncategorized</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Duplicates Section */}
        {importResult.duplicates && importResult.duplicates.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              {isAllDuplicates ? "Previously Imported Transactions" : "Duplicate Transactions Skipped"}
            </h4>
            <p className="text-xs text-blue-700 mb-2">
              {isAllDuplicates
                ? "These transactions have already been imported from a previous OFX file:"
                : "The following transaction IDs were already in your account:"}
            </p>
            <div className="text-xs text-blue-700 max-h-32 overflow-y-auto">
              {importResult.duplicates.slice(0, 10).map((dup: string, index: number) => (
                <div key={index} className="mb-1">
                  • {dup}
                </div>
              ))}
              {importResult.duplicates.length > 10 && (
                <div className="text-blue-600 mt-2">... and {importResult.duplicates.length - 10} more duplicates</div>
              )}
            </div>
          </div>
        )}

        {/* Errors Section */}
        {importResult.errors && importResult.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
            <h4 className="text-sm font-medium text-red-800 mb-2">Import Errors</h4>
            <div className="text-xs text-red-700 max-h-32 overflow-y-auto">
              {importResult.errors.slice(0, 10).map((error: string, index: number) => (
                <div key={index} className="mb-1">
                  • {error}
                </div>
              ))}
              {importResult.errors.length > 10 && (
                <div className="text-red-600 mt-2">... and {importResult.errors.length - 10} more errors</div>
              )}
            </div>
          </div>
        )}

        <button onClick={onCancel} className={`px-6 py-2 rounded-md text-white ${getButtonColor()}`}>
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}