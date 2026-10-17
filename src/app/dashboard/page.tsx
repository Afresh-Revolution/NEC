import { redirect } from "next/navigation";
import PortalPreview from "@/components/portal-preview";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { getAnnualMembershipFee } from "@/lib/membership-plans";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/dashboard");

  const [application] = await getSql()<{ id: string; status: string }[]>`
    select id, status from public.membership_applications where user_id = ${user.id}
  `;

  const [subscription] = await getSql()<{
    plan_code: "monthly" | "yearly";
    amount_minor: string;
    status: string;
    auto_renew: boolean;
    current_period_end: string | null;
    can_manage_renewal: boolean;
  }[]>`
    select plan_code, amount_minor::text, status, auto_renew, current_period_end,
      (paystack_subscription_code is not null and paystack_email_token is not null) as can_manage_renewal
    from public.membership_subscriptions
    where user_id = ${user.id}
  `;

  let checkoutAvailable = false;
  const annualMembershipFee = getAnnualMembershipFee();
  if (process.env.PAYMENTS_ENABLED === "true" && process.env.PAYSTACK_SECRET_KEY) {
    const [flag] = await getSql()<{ enabled: boolean }[]>`
      select enabled from public.feature_flags where flag_code = 'live_payments'
    `;
    checkoutAvailable = flag?.enabled ?? false;
  }

  return (
    <PortalPreview
      mode="member"
      userName={user.full_name || user.email}
      applicationStatus={application?.status ?? null}
      annualMembershipFee={annualMembershipFee.amountLabel}
      subscription={subscription ?? null}
      checkoutAvailable={checkoutAvailable}
    />
  );
}
