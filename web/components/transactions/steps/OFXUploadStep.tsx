// components/transactions/steps/OFXUploadStep.tsx
"use client";

import { useRef } from "react";
import { Account } from "@/lib/features/accounts";

interface OFXUploadStepProps {
  file: File | null;
  selectedAccountId: string;
  accounts: Account[];
  loading: boolean;
  error: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileUpload: () => void;
  onAccountSelect: (accountId: string) => void;
  onCancel: () => void;
}

export default function OFXUploadStep({
  file,
  selectedAccountId,
  accounts,
  loading,
  error,
  onFileSelect,
  onFileUpload,
  onAccountSelect,
  onCancel,
}: OFXUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input ref={fileInputRef} type="file" accept=".ofx" onChange={onFileSelect} className="hidden" />

        {!file ? (
          <div>
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload OFX File</h3>
            <p className="text-gray-600 mb-4">Select an OFX file from your bank</p>
            <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
              Choose File
            </button>
          </div>
        ) : (
          <div>
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">File Selected</h3>
            <p className="text-gray-600 mb-4">{file.name}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Change File
              </button>
              <button
                onClick={onFileUpload}
                disabled={loading || !selectedAccountId}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Parsing..." : "Parse File"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Selection - always visible */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Account for Import
          {file && !selectedAccountId && (
            <span className="text-red-600 ml-1">*</span>
          )}
        </label>
        {accounts.length > 0 ? (
          <select
            value={selectedAccountId}
            onChange={(e) => onAccountSelect(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Choose an account...</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name} ({account.bank_name})
              </option>
            ))}
          </select>
        ) : (
          <div className="text-red-600 text-sm">No accounts available. Please add an account before importing transactions.</div>
        )}
        {file && !selectedAccountId && accounts.length > 0 && (
          <div className="text-amber-600 text-sm mt-2">
            Please select an account to continue with parsing the file.
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-600">{error}</div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onCancel} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}
