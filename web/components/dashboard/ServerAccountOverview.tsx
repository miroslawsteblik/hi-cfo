import { getUserAccounts } from "@/app/actions/transactions";
import AccountOverview from "./AccountOverview";
import { Account } from "@/lib/types/accounts/base";

export default async function ServerAccountOverview() {
  let accounts: Account[] = [];

  try {
    // Fetch user accounts
    accounts = await getUserAccounts();
  } catch (error) {
    console.error("Error fetching accounts:", error);
    // Component will handle empty state
  }

  return <AccountOverview accounts={accounts} />;
}