// components/transactions/steps/OFXPreviewStep.tsx
"use client";

import { ParsedOFX, EnhancedPreviewTransaction } from "@/lib/types/transactions";
import { OFXParser } from "@/lib/ofx-parser";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OFXPreviewStepProps {
  parsedData: ParsedOFX;
  previewTransactions: EnhancedPreviewTransaction[];
  selectedAccountId: string;
  categorizationLoading: boolean;
  error: string | null;
  onTransactionToggle: (index: number) => void;
  onToggleAll: () => void;
  onBack: () => void;
  onCancel: () => void;
  onPreviewCategorization: () => void;
}

export default function OFXPreviewStep({
  parsedData,
  previewTransactions,
  selectedAccountId,
  categorizationLoading,
  error,
  onTransactionToggle,
  onToggleAll,
  onBack,
  onCancel,
  onPreviewCategorization,
}: OFXPreviewStepProps) {
  const selectedCount = previewTransactions.filter((t) => t.selected).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Transaction Preview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Account:</span>
            <span className="ml-2 font-medium">{parsedData.statement.account.acctId}</span>
          </div>
          <div>
            <span className="text-gray-600">Date Range:</span>
            <span className="ml-2 font-medium">
              {formatDate(parsedData.statement.dtStart)} - {formatDate(parsedData.statement.dtEnd)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Transactions:</span>
            <span className="ml-2 font-medium">{previewTransactions.length}</span>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Select Transactions</h3>
            <div className="flex items-center space-x-4">
              <button onClick={onToggleAll} className="text-sm text-blue-600 hover:text-blue-800">
                {previewTransactions.every((t) => t.selected) ? "Deselect All" : "Select All"}
              </button>
              <span className="text-sm text-gray-600">{selectedCount} selected</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Import</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewTransactions.map((transaction, index) => (
                <tr key={transaction.original.fit_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={transaction.selected}
                      onChange={() => onTransactionToggle(index)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(transaction.original.dtPosted)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium">{transaction.original.name}</div>
                    {transaction.original.memo && (
                      <div className="text-gray-500 text-xs truncate max-w-xs">{transaction.original.memo}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.original.amount >= 0 ? "text-green-600" : "text-red-600"}>
                      {transaction.original.amount >= 0 ? "+" : "-"}
                      {formatCurrency(transaction.original.amount, transaction.original.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {OFXParser.mapTransactionType(transaction.original.trnType, transaction.original.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-600">{error}</div>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
          Back
        </button>
        <div className="flex space-x-4">
          <button onClick={onCancel} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={onPreviewCategorization}
            disabled={categorizationLoading || !selectedAccountId || selectedCount === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {categorizationLoading ? "Analyzing..." : `Preview Categorization (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}