

import { OFXTransaction, OFXAccount, OFXStatement, ParsedOFX, ParseOFXResponse } from "./types";

// ==========================================
// MAIN EXPORT - Single parseOFXFile function
// ==========================================
export const parseOFXFile = async (fileContent: string): Promise<ParseOFXResponse> => {
  try {
    console.log("🔍 Parsing OFX file...");

    // Validate input
    if (!fileContent || fileContent.trim().length === 0) {
      return {
        success: false,
        error: "OFX file content is empty",
      };
    }

    if (!fileContent.includes("<OFX>")) {
      return {
        success: false,
        error: "Invalid OFX format: Missing <OFX> tag",
      };
    }

    // Use the existing OFXParser class
    const parsedData = OFXParser.parseOFX(fileContent);

    // Validate parsed data
    const errors = OFXParser.validateParsedData(parsedData);
    if (errors.length > 0) {
      return {
        success: false,
        error: `Validation errors: ${errors.join(", ")}`,
      };
    }

    console.log("✅ :", {
      transactions: parsedData.statement.transactions.length,
      account: parsedData.statement.account.acctId,
      dateRange: `${parsedData.statement.dtStart} to ${parsedData.statement.dtEnd}`,
      currency: parsedData.statement.transactions[0]?.currency || "USD",
    });

    return {
      success: true,
      data: parsedData,
    };
  } catch (error) {
    console.error("❌ OFX parsing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown parsing error",
    };
  }
};

// ==========================================
// EXISTING OFXParser CLASS (Enhanced)
// ==========================================
export class OFXParser {
  static parseOFX(content: string): ParsedOFX {
    try {
      const [headerSection, bodySection] = this.splitHeaderAndBody(content);

      const header = this.parseHeader(headerSection);

      this.validateHeader(header);

      const statement = this.parseStatement(bodySection);

      return { statement, header };
    } catch (error) {
      throw new Error(`OFX parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private static splitHeaderAndBody(content: string): [string, string] {
    const lines = content.split("\n");
    let headerEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("<OFX>")) {
        headerEnd = i;
        break;
      }
    }

    if (headerEnd === -1) {
      throw new Error("Invalid OFX format: No <OFX> tag found");
    }

    const headerSection = lines.slice(0, headerEnd).join("\n");
    const bodySection = lines.slice(headerEnd).join("\n");

    return [headerSection, bodySection];
  }

  private static parseHeader(headerSection: string): Record<string, string> {
    const header: Record<string, string> = {};
    const lines = headerSection.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes(":")) {
        const [key, value] = trimmed.split(":", 2);
        header[key.trim()] = value.trim();
      }
    }

    return header;
  }

  private static validateHeader(header: Record<string, string>): void {
    const requiredFields = ["OFXHEADER", "DATA", "VERSION"];

    for (const field of requiredFields) {
      if (!header[field]) {
        throw new Error(`Missing required header field: ${field}`);
      }
    }

    if (header.DATA !== "OFXSGML") {
      throw new Error(`Unsupported data format: ${header.DATA}`);
    }
  }

  private static parseStatement(bodySection: string): OFXStatement {
    // Clean up the OFX content - remove extra whitespace but preserve structure
    const cleanContent = bodySection.replace(/\s+</g, "<").replace(/>\s+/g, ">");

    const account = this.extractAccount(cleanContent);
    const dtStart = this.extractValue(cleanContent, "DTSTART") || "";
    const dtEnd = this.extractValue(cleanContent, "DTEND") || "";
    const statementCurrency = this.extractStatementCurrency(cleanContent);
    console.log("💰 Statement currency detected:", statementCurrency);

    const transactions = this.extractTransactions(cleanContent, statementCurrency);

    return {
      account,
      transactions,
      dtStart: this.parseOFXDate(dtStart),
      dtEnd: this.parseOFXDate(dtEnd),
    };
  }

  private static extractAccount(content: string): OFXAccount {
    const bankId = this.extractValue(content, "BANKID") || "";
    const acctId = this.extractValue(content, "ACCTID") || "";
    const acctType = this.extractValue(content, "ACCTTYPE") || "CHECKING";

    if (!bankId || !acctId) {
      throw new Error("Missing required account information (BANKID or ACCTID)");
    }

    return { bankId, acctId, acctType };
  }

  private static extractStatementCurrency(content: string): string {
    console.log("🔍 Looking for statement currency...");

    // Look for currency in multiple possible locations and patterns
    const currencyPatterns = [
      /<CURDEF>([^<\s]*)/i, // <CURDEF>GBP
      /<CURSYM>([^<\s]*)/i, // <CURSYM>£
      /<CURRENCY>([^<\s]*)/i, // <CURRENCY>GBP
    ];

    for (const pattern of currencyPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const currency = match[1].trim();
        const normalized = this.normalizeCurrency(currency);
        return normalized;
      }
    }

    // Also try the old method as fallback
    const currencyLocations = ["CURDEF", "CURSYM", "CURRENCY"];
    for (const location of currencyLocations) {
      const currency = this.extractValue(content, location);
      if (currency) {
        const normalized = this.normalizeCurrency(currency);
        return normalized;
      }
    }

    console.log("⚠️ No currency found, defaulting to USD");
    return "USD";
  }

  private static normalizeCurrency(currency: string): string {
    if (!currency) return "USD";

    const normalized = currency.toUpperCase().trim();

    // Map common variations to standard codes
    const currencyMap: Record<string, string> = {
      DOLLAR: "USD",
      DOLLARS: "USD",
      $: "USD",
      POUND: "GBP",
      POUNDS: "GBP",
      "£": "GBP",
      EURO: "EUR",
      EUROS: "EUR",
      "€": "EUR",
    };

    return currencyMap[normalized] || normalized;
  }

  private static extractTransactions(content: string, defaultCurrency: string): OFXTransaction[] {
    const transactions: OFXTransaction[] = [];

    // Find all STMTTRN blocks
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
      const transactionContent = match[1];

      try {
        // Use transaction-level currency if available, otherwise use statement currency
        const transactionCurrency =
          this.extractValue(transactionContent, "CURDEF") || this.extractValue(transactionContent, "CURSYM") || defaultCurrency; // ✅ This now properly uses the statement currency

        const transaction: OFXTransaction = {
          trnType: this.extractValue(transactionContent, "TRNTYPE") || "OTHER",
          dtPosted: this.parseOFXDate(this.extractValue(transactionContent, "DTPOSTED") || ""),
          amount: parseFloat(this.extractValue(transactionContent, "TRNAMT") || "0"),
          fit_id: this.extractValue(transactionContent, "FITID") || "",
          name: this.extractValue(transactionContent, "NAME") || "",
          memo: this.extractValue(transactionContent, "MEMO") || undefined,
          checkNum: this.extractValue(transactionContent, "CHECKNUM") || undefined,
          currency: this.normalizeCurrency(transactionCurrency),
        };

        // Validate required fields
        if (!transaction.fit_id) {
          console.warn("Transaction missing FITID, skipping");
          continue;
        }

        if (!transaction.name) {
          transaction.name = "Unknown Transaction";
        }

        transactions.push(transaction);
      } catch (error) {
        console.warn(`Failed to parse transaction: ${error instanceof Error ? error.message : "Unknown error"}`);
        continue;
      }
    }

    return transactions;
  }

  private static extractValue(content: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>([^<]*?)(?:<|$)`, "i");
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  private static parseOFXDate(ofxDate: string): string {
    if (!ofxDate) return "";

    try {
      // OFX dates can be in formats like:
      // 20250630000000[-5:EST]
      // 20250630000000
      // 20250630

      // Remove timezone info and extract just the date part
      const dateOnly = ofxDate.split("[")[0];

      // Handle different date lengths
      let year: string, month: string, day: string;

      if (dateOnly.length >= 8) {
        year = dateOnly.substring(0, 4);
        month = dateOnly.substring(4, 6);
        day = dateOnly.substring(6, 8);
      } else {
        throw new Error(`Invalid date format: ${ofxDate}`);
      }

      // Validate date components
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);

      if (yearNum < 1900 || yearNum > 2100 || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        throw new Error(`Invalid date values: ${year}-${month}-${day}`);
      }

      // Return ISO date string
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn(`Failed to parse date "${ofxDate}": ${error instanceof Error ? error.message : "Unknown error"}`);
      // Return today's date as fallback
      return new Date().toISOString().split("T")[0];
    }
  }

  // ==========================================
  // UTILITY METHODS (Used by component)
  // ==========================================
  static mapTransactionType(ofxType: string, amount: number): "income" | "expense" | "transfer" {
    const typeUpper = ofxType.toUpperCase();

    // Handle explicit transfer types first
    if (typeUpper === "TRANSFER" || typeUpper === "XFER") {
      return "transfer";
    }

    if (amount > 0) {
      return "income";
    } else if (amount < 0) {
      return "expense";
    }

    // Fallback to TRNTYPE mapping if amount is zero
    const typeMap: Record<string, "income" | "expense" | "transfer"> = {
      CREDIT: "income",
      DEPOSIT: "income",
      INT: "income", // Interest
      DIV: "income", // Dividend
      DIRECTDEP: "income", // Direct deposit
      DEBIT: "expense",
      PAYMENT: "expense",
      WITHDRAWAL: "expense",
      CHECK: "expense",
      FEE: "expense",
      SRVCHG: "expense", // Service charge
      ATM: "expense",
      POS: "expense", // Point of sale
      TRANSFER: "transfer",
      XFER: "transfer",
    };

    return typeMap[typeUpper] || "expense";
  }

  static cleanMerchantName(name: string): string {
    if (!name) return "";

    // Remove common OFX artifacts
    return name
      .replace(/\s+ON\s+\d{2}\s+\w{3}\s+\w{2,3}$/i, "") // Remove "ON 29 JUN CLP" type endings
      .replace(/\s+\d{10,}$/, "") // Remove long numbers at the end
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  }

  static validateParsedData(parsed: ParsedOFX): string[] {
    const errors: string[] = [];

    if (!parsed.statement.account.acctId) {
      errors.push("Missing account ID");
    }

    if (!parsed.statement.account.bankId) {
      errors.push("Missing bank ID");
    }

    if (parsed.statement.transactions.length === 0) {
      errors.push("No transactions found in statement");
    }

    // Validate transactions
    parsed.statement.transactions.forEach((txn, index) => {
      if (!txn.fit_id) {
        errors.push(`Transaction ${index + 1}: Missing FITID`);
      }

      if (!txn.name) {
        errors.push(`Transaction ${index + 1}: Missing name/description`);
      }

      if (txn.amount === 0) {
        console.warn(`Transaction ${index + 1}: Zero amount - ${txn.name}`);
      }

      if (isNaN(txn.amount)) {
        errors.push(`Transaction ${index + 1}: Invalid amount`);
      }
    });

    return errors;
  }
}

// ==========================================
// CONVENIENCE EXPORTS
// ==========================================
export { OFXParser as Parser };

// Legacy support - keep the parseOFX method available
export const parseOFX = OFXParser.parseOFX;
