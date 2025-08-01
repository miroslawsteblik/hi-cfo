"use server";

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiClient } from "@/lib/api/client";
import { Currency, UserAuthDTO } from "@/lib/shared/types";
import { FinancialAppError, ErrorCode, ErrorLogger } from "@/lib/errors";
import { getServerUser } from "@/lib/auth/auth";

export async function updateUserCurrencyPreference(
  currency: Currency
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user) {
      redirect("/login");
    }

    // Since the backend doesn't have /api/v1/me endpoint yet,
    // we'll store the preference in a separate cookie for now
    const cookieStore = await cookies();
    
    // Store currency preference in a dedicated cookie
    cookieStore.set("user_currency_preference", currency, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    // Also update the auth cookie with new preference for immediate use
    const updatedUser: UserAuthDTO = {
      ...user,
      preferred_currency: currency
    };
    
    cookieStore.set("auth_user", JSON.stringify(updatedUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Revalidate pages that use currency formatting
    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/settings");

    await ErrorLogger.getInstance().logInfo("User currency preference updated (client-side)", {
      userId: user.id,
      currency,
      context: "update_currency_preference"
    });

    return { success: true };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.SYSTEM_ERROR,
      message: "Failed to update currency preference",
      details: { originalError: error, context: "update_currency_preference" }
    });
    await ErrorLogger.getInstance().logError(appError);
    return { success: false, error: appError.message };
  }
}

export async function getUserPreference(): Promise<{
  success: boolean;
  data?: { preferred_currency: Currency };
  error?: string;
}> {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    return {
      success: true,
      data: {
        preferred_currency: user.preferred_currency || 'GBP'
      }
    };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.SYSTEM_ERROR,
      message: "Failed to get user preferences",
      details: { originalError: error, context: "get_user_preference" }
    });
    await ErrorLogger.getInstance().logError(appError);
    return { success: false, error: appError.message };
  }
}