import InfoPage from "@/components/info-page";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const reports = await getSql()<{
    id: string;
    report_type: string;
    report_year: number;
    report_quarter: number | null;
    title: string;
    summary: string;
    profits_minor: string | null;
    losses_minor: string | null;
    reserve_minor: string | null;
    opportunities: string | null;
    published_at: string;
  }[]>`
    select id, report_type, report_year, report_quarter, title, summary,
      profits_minor::text, losses_minor::text, reserve_minor::text, opportunities,
      published_at::text
    from public.cooperative_reports
    where published
    order by report_year desc, report_quarter desc nulls last
    limit 40
  `;
  return <InfoPage page="reports" reports={reports} />;
}
