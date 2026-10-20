import InfoPage from "@/components/info-page";
import { getAnnualMembershipFee } from "@/lib/membership-plans";

export default function Page() {
  const annualFee = getAnnualMembershipFee();
  return (
    <InfoPage
      page="membership"
      annualMembershipFee={annualFee.amountLabel}
      annualMembershipCompareAt={annualFee.compareAtLabel}
    />
  );
}
