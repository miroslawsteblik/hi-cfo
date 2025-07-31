"use client";

import { useState, useCallback } from "react";
import { parseOFXFile } from "@/lib/features/transactions";

// Utility functions to replace OFXParser methods
const mapTransactionType = (trnType: string, amount: number): "income" | "expense" | "transfer" => {
  if (amount >= 0) return "income";
  return "expense";
};

const cleanMerchantName = (name: string): string => {
  return name?.trim() || "";
};
import {
  previewBulkCategorization,
  bulkCreateTransactionsWithCategorization,
  TransactionData,
  ParsedOFX,
  EnhancedPreviewTransaction,
  CategorizationPreview,
  ImportStep,
  ImportResult,
  ParseOFXResponse,
} from "@/lib/features/transactions";

interface UseOFXImportProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const useOFXImport = ({ onSuccess, onCancel }: UseOFXImportProps) => {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedOFX | null>(null);
  const [previewTransactions, setPreviewTransactions] = useState<EnhancedPreviewTransaction[]>([]);
  const [categorizationPreview, setCategorizationPreview] = useState<CategorizationPreview | null>(
    null
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [categorizationLoading, setCategorizationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // File handling
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const handleFileUpload = useCallback(async () => {
    if (!file) return;

    if (!selectedAccountId) {
      setError("Please select an account before parsing the file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fileContent = await file.text();
      const parseResult: ParseOFXResponse = await parseOFXFile(fileContent);

      if (!parseResult.success || !parseResult.data) {
        throw new Error(parseResult.error || "Failed to parse OFX file");
      }

      setParsedData(parseResult.data);

      const preview: EnhancedPreviewTransaction[] = parseResult.data.statement.transactions.map(
        (txn, index) => ({
          original: txn,
          selected: true,
          index,
        })
      );

      setPreviewTransactions(preview);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse OFX file");
    } finally {
      setLoading(false);
    }
  }, [file]);

  // Transaction selection
  const toggleTransactionSelection = useCallback((index: number) => {
    setPreviewTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  }, []);

  const toggleAllTransactions = useCallback(() => {
    const allSelected = previewTransactions.every((t) => t.selected);
    setPreviewTransactions((prev) => prev.map((t) => ({ ...t, selected: !allSelected })));
  }, [previewTransactions]);

  // Category handling
  const handleCategoryChange = useCallback((transactionIndex: number, categoryId: string) => {
    setPreviewTransactions((prev) =>
      prev.map((tx, index) =>
        index === transactionIndex ? { ...tx, manualCategoryId: categoryId || undefined } : tx
      )
    );
  }, []);

  // Categorization preview
  const handlePreviewCategorization = useCallback(async () => {
    if (!parsedData || !selectedAccountId) {
      setError("Please select an account");
      return;
    }

    const selectedTransactions = previewTransactions
      .filter((t) => t.selected)
      .map((t) => t.original);

    if (selectedTransactions.length === 0) {
      setError("Please select at least one transaction to preview");
      return;
    }

    setCategorizationLoading(true);
    setError(null);

    try {
      // Use local utility functions

      const transactionsToPreview: TransactionData[] = selectedTransactions.map((ofxTxn) => ({
        account_id: selectedAccountId,
        fit_id: ofxTxn.fit_id,
        fileUploadId: crypto.randomUUID(),
        transaction_date: new Date(ofxTxn.dtPosted + "T00:00:00.000Z").toISOString(),
        description: ofxTxn.name || "Imported Transaction",
        amount: ofxTxn.amount,
        transaction_type: mapTransactionType(ofxTxn.trnType, ofxTxn.amount),
        merchant_name: cleanMerchantName(ofxTxn.name),
        memo: `${ofxTxn.memo || ""} | Imported from OFX - FITID: ${ofxTxn.fit_id}`.trim(),
        tags: ["imported", "ofx"],
        currency: ofxTxn.currency || "USD",
      }));

      const previewResult = await previewBulkCategorization(transactionsToPreview);

      if (!previewResult?.success) {
        throw new Error(previewResult?.error || "Server returned error");
      }

      let actualData;
      if (
        previewResult.data &&
        typeof previewResult.data === "object" &&
        "data" in previewResult.data
      ) {
        actualData = (previewResult.data as any).data;
      } else {
        actualData = previewResult.data;
      }
      if (!actualData) {
        throw new Error("No data in server response");
      }

      const categorizationPreview: CategorizationPreview = {
        total_transactions: actualData.total_transactions || 0,
        will_be_categorized: actualData.will_be_categorized || 0,
        success_rate:
          actualData.total_transactions > 0
            ? actualData.will_be_categorized / actualData.total_transactions
            : 0,
        previews: Array.isArray(actualData.previews) ? actualData.previews : [],
      };

      setCategorizationPreview(categorizationPreview);

      const enhancedPreviews: EnhancedPreviewTransaction[] = previewTransactions.map(
        (txPreview) => {
          const categorizationData = categorizationPreview.previews.find((catPreview: any) => {
            return catPreview?.index === txPreview.index;
          });

          return {
            ...txPreview,
            categorizationPreview: categorizationData || undefined,
          };
        }
      );

      setPreviewTransactions(enhancedPreviews);
      setStep("categorization");
    } catch (err) {
      console.error("❌ Categorization preview failed:", err);
      setError(err instanceof Error ? err.message : "Failed to preview categorization");
    } finally {
      setCategorizationLoading(false);
    }
  }, [parsedData, selectedAccountId, previewTransactions]);

  // Import handling
  const handleImport = useCallback(async () => {
    if (!parsedData || !selectedAccountId) {
      setError("Please select an account");
      return;
    }

    const selectedTransactions = previewTransactions
      .filter((t) => t.selected)
      .map((t) => t.original);

    if (selectedTransactions.length === 0) {
      setError("Please select at least one transaction to import");
      return;
    }

    setLoading(true);
    setStep("importing");
    setError(null);

    try {
      // Use local utility functions

      const transactionsToImport: TransactionData[] = selectedTransactions.map((ofxTxn) => {
        const originalIndex = previewTransactions.findIndex(
          (p) => p.original.fit_id === ofxTxn.fit_id
        );
        const manualCategoryId = previewTransactions[originalIndex]?.manualCategoryId;

        return {
          account_id: selectedAccountId,
          fit_id: ofxTxn.fit_id,
          file_upload_id: crypto.randomUUID(),
          category_id: manualCategoryId,
          transaction_date: new Date(ofxTxn.dtPosted + "T00:00:00.000Z").toISOString(),
          description: ofxTxn.name || "Imported Transaction",
          amount: ofxTxn.amount,
          transaction_type: mapTransactionType(ofxTxn.trnType, ofxTxn.amount),
          merchant_name: cleanMerchantName(ofxTxn.name),
          memo: `${ofxTxn.memo || ""} | Imported from OFX - FITID: ${ofxTxn.fit_id}`.trim(),
          tags: ["imported", "ofx"],
          currency: ofxTxn.currency || "USD",
        };
      });

      const result = await bulkCreateTransactionsWithCategorization(transactionsToImport);

      // Check if this is an "all duplicates" scenario (treated as success)
      const isAllDuplicates =
        result.data?.created === 0 &&
        result.data?.skipped > 0 &&
        result.data?.duplicates &&
        result.data.duplicates.length > 0 &&
        result.data.duplicates.length === result.data.skipped;

      const hasNewTransactions = (result.data?.created || 0) > 0;
      const isSuccess = result.success || isAllDuplicates;

      const importStats: ImportResult = {
        success: isSuccess,
        imported: result.data?.created || 0,
        skipped: result.data?.skipped || 0,
        errors: result.data?.errors || [],
        duplicates: result.data?.duplicates || [],
        categorization_summary: hasNewTransactions
          ? {
              auto_categorized: categorizationPreview?.will_be_categorized || 0,
              manually_assigned: previewTransactions.filter((t) => t.manualCategoryId).length,
              uncategorized:
                (result.data?.created || 0) - (categorizationPreview?.will_be_categorized || 0),
            }
          : undefined,
      };

      console.log("✅ Import completed:", importStats);
      setImportResult(importStats);
      setStep("result");

      // Auto-close after successful import
      if (isSuccess && !importStats.errors.length) {
        const delay = isAllDuplicates ? 4000 : 3000; // Longer delay for all-duplicates message
        setTimeout(() => {
          onSuccess();
        }, delay);
      } else if (!isSuccess) {
        throw new Error(result.error || "Failed to import transactions");
      }
    } catch (err) {
      console.error("❌ Import exception:", err);
      setError(err instanceof Error ? err.message : "Failed to import transactions");
      setStep("categorization");
    } finally {
      setLoading(false);
    }
  }, [parsedData, selectedAccountId, previewTransactions, categorizationPreview, onSuccess]);

  return {
    // State
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

    // Actions
    setSelectedAccountId,
    setStep,
    handleFileSelect,
    handleFileUpload,
    toggleTransactionSelection,
    toggleAllTransactions,
    handleCategoryChange,
    handlePreviewCategorization,
    handleImport,
    onCancel,
  };
};
