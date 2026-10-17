import InfoPage from "@/components/info-page";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const events = await getSql()<{
    id: string;
    title: string;
    category: string;
    description: string;
    starts_at: string;
    venue: string | null;
    state_name: string | null;
  }[]>`
    select event.id, event.title, event.category, event.description,
      event.starts_at::text, event.venue, chapter.state_name
    from public.events event
    left join public.chapters chapter on chapter.state_code = event.state_code
    where event.status = 'approved' and event.is_public and event.starts_at > now()
    order by event.starts_at asc
    limit 60
  `;
  return <InfoPage page="events" publicEvents={events} />;
}
