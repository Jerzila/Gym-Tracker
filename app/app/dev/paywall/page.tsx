import { getAffiliateSavedCode } from "@/app/actions/affiliate";
import { Paywall } from "@/components/paywall/Paywall";

export default async function DevPaywallPage() {
  const savedAffiliateCode = await getAffiliateSavedCode();
  return <Paywall savedAffiliateCode={savedAffiliateCode} />;
}
