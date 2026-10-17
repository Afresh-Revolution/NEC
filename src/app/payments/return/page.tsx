import PaymentReturn from "@/components/payment-return";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  return <PaymentReturn reference={reference ?? ""} />;
}
