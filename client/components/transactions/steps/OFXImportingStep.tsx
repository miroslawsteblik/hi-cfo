// components/transactions/steps/OFXImportingStep.tsx
"use client";

export default function OFXImportingStep() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Transactions</h3>
        <p className="text-gray-600">Please wait while we import your transactions with enhanced categorization...</p>
      </div>
    </div>
  );
}