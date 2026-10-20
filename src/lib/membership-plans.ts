import "server-only";

export type AnnualMembershipFee = {
  amountMinor: number;
  amountLabel: string;
  compareAtLabel: string;
};

function configuredAmount(name: string, fallback: number) {
  const configured = process.env[name];
  if (!configured) return fallback;
  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number of kobo.`);
  }
  return value;
}

function naira(amountMinor: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function getAnnualMembershipFee(): AnnualMembershipFee {
  const amountMinor = configuredAmount("MEMBERSHIP_ANNUAL_FEE_KOBO", 5_000_000);
  return {
    amountMinor,
    amountLabel: naira(amountMinor),
    compareAtLabel: naira(amountMinor * 2),
  };
}
