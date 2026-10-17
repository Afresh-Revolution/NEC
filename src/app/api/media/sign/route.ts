import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to add portfolio media." }, { status: 401 });
  const body = await request.json().catch(() => null) as { resourceType?: unknown } | null;
  if (body?.resourceType !== "image" && body?.resourceType !== "video") {
    return NextResponse.json({ error: "Choose an image or video upload." }, { status: 400 });
  }

  const [membership] = await getSql()<{ active: boolean }[]>`
    select exists (
      select 1 from public.memberships member
      join public.membership_subscriptions subscription on subscription.user_id = member.user_id
      where member.user_id = ${user.id}
        and member.status = 'active'
        and subscription.status in ('active', 'non_renewing')
        and subscription.current_period_end > now()
    ) as active
  `;
  if (!membership?.active) {
    return NextResponse.json({ error: "An active membership is required to publish portfolio media." }, { status: 403 });
  }
  const [portfolio] = await getSql()<{ item_count: number }[]>`
    select count(*)::int as item_count
    from public.member_media
    where user_id = ${user.id}
  `;
  if ((portfolio?.item_count ?? 0) >= 12) {
    return NextResponse.json({ error: "Your portfolio is full. Remove an item before adding more; the limit is 12." }, { status: 409 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Portfolio uploads are not available yet." }, { status: 503 });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `necnaija/${user.id}`;
  const publicId = randomUUID();
  const signature = createHash("sha1")
    .update(`folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
  return NextResponse.json({
    cloudName,
    apiKey,
    folder,
    publicId,
    resourceType: body.resourceType,
    timestamp,
    signature,
  });
}
