export type RestorePurchasesResult = {
  foundPurchases: boolean;
  message: string;
};

export async function runRestorePurchasesCheck(): Promise<RestorePurchasesResult> {
  try {
    // Placeholder until Liftly Pro subscriptions are available.
    return {
      foundPurchases: false,
      message: "No purchases were found for this Apple ID.",
    };
  } catch (err) {
    console.error("[purchases] runRestorePurchasesCheck failed", err);
    throw err;
  }
}
