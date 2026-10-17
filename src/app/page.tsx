import HomePage from "@/components/home-page";
import { getAnnualMembershipFee } from "@/lib/membership-plans";

export default function Page() {
  const annualFee = getAnnualMembershipFee();
  return <HomePage annualMembershipFee={annualFee.amountLabel} />;
}
