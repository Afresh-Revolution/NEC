import InfoPage from "@/components/info-page";
import type { PublicPortfolio } from "@/components/public-portfolio-gallery";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const media = await getSql()<{
    user_id: string;
    name: string;
    discipline: string | null;
    chapter: string | null;
    id: string;
    secure_url: string;
    resource_type: "image" | "video";
  }[]>`
    select
      profile.user_id,
      coalesce(nullif(artist.stage_name, ''), nullif(profile.stage_name, ''), profile.full_name) as name,
      profile.profession as discipline,
      profile.home_state as chapter,
      portfolio.id,
      portfolio.secure_url,
      portfolio.resource_type
    from public.member_media portfolio
    join public.artist_profiles artist on artist.user_id = portfolio.user_id and artist.is_public
    join public.profiles profile on profile.user_id = portfolio.user_id
    join public.memberships member on member.user_id = portfolio.user_id and member.status = 'active'
    join public.membership_subscriptions subscription on subscription.user_id = portfolio.user_id
    where portfolio.is_public
      and subscription.status in ('active', 'non_renewing')
      and subscription.current_period_end > now()
    order by portfolio.created_at desc
    limit 120
  `;
  const grouped = new Map<string, PublicPortfolio>();
  for (const item of media) {
    let portfolio = grouped.get(item.user_id);
    if (!portfolio) {
      portfolio = {
        userId: item.user_id,
        name: item.name,
        discipline: item.discipline,
        chapter: item.chapter,
        media: [],
      };
      grouped.set(item.user_id, portfolio);
    }
    portfolio.media.push({
      id: item.id,
      url: item.secure_url,
      type: item.resource_type,
    });
  }
  return <InfoPage page="artists" portfolios={[...grouped.values()]} />;
}
