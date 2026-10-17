import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSql } from "@/lib/db";

const maximumBytes = 10 * 1024 * 1024;
const imageFormats = new Set(["avif", "jpg", "jpeg", "png", "webp"]);
const videoFormats = new Set(["mp4", "mov", "webm"]);

async function destroyCloudinaryAsset(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  resourceType: "image" | "video",
  publicId: string,
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("timestamp", String(timestamp));
  form.set("api_key", apiKey);
  form.set("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const result = await response.json().catch(() => null) as { result?: string } | null;
  if (!response.ok || result?.result !== "ok" && result?.result !== "not found") {
    throw new Error("Cloudinary could not remove an invalid upload.");
  }
}

async function hasActiveMembership(userId: string) {
  const [result] = await getSql()<{ active: boolean }[]>`
    select exists (
      select 1 from public.memberships member
      join public.membership_subscriptions subscription on subscription.user_id = member.user_id
      where member.user_id = ${userId}
        and member.status = 'active'
        and subscription.status in ('active', 'non_renewing')
        and subscription.current_period_end > now()
    ) as active
  `;
  return result?.active === true;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your portfolio media." }, { status: 401 });
  const media = await getSql()<{
    id: string;
    secure_url: string;
    resource_type: "image" | "video";
    format: string;
    bytes: number;
    created_at: string;
  }[]>`
    select id, secure_url, resource_type, format, bytes, created_at
    from public.member_media
    where user_id = ${user.id}
    order by created_at desc
  `;
  return NextResponse.json({ media });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to save portfolio media." }, { status: 401 });
  if (!(await hasActiveMembership(user.id))) {
    return NextResponse.json({ error: "An active membership is required to publish portfolio media." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as {
    publicId?: unknown;
    version?: unknown;
    signature?: unknown;
    secureUrl?: unknown;
    resourceType?: unknown;
    format?: unknown;
    bytes?: unknown;
    duration?: unknown;
  } | null;
  if (
    typeof body?.publicId !== "string" ||
    !body.publicId.startsWith(`necnaija/${user.id}/`) ||
    typeof body.version !== "number" ||
    !Number.isSafeInteger(body.version) ||
    typeof body.signature !== "string" ||
    !/^[a-f\d]{40}$/i.test(body.signature) ||
    typeof body.secureUrl !== "string" ||
    (body.resourceType !== "image" && body.resourceType !== "video") ||
    typeof body.format !== "string" ||
    typeof body.bytes !== "number" ||
    !Number.isSafeInteger(body.bytes) ||
    body.bytes <= 0 ||
    body.bytes > maximumBytes
  ) {
    return NextResponse.json({ error: "Uploaded media details are invalid or exceed the 10 MB limit." }, { status: 400 });
  }
  if (body.resourceType === "video" && (
    typeof body.duration !== "number" ||
    !Number.isFinite(body.duration) ||
    body.duration <= 0 ||
    body.duration > 60
  )) {
    return NextResponse.json({ error: "Videos must be 60 seconds or shorter." }, { status: 400 });
  }
  if (
    body.resourceType === "image" && !imageFormats.has(body.format.toLowerCase()) ||
    body.resourceType === "video" && !videoFormats.has(body.format.toLowerCase())
  ) {
    return NextResponse.json({ error: "This image or video format is not supported." }, { status: 400 });
  }
  const resourceType = body.resourceType;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Portfolio uploads are not available yet." }, { status: 503 });
  }
  let assetResponse: Response;
  try {
    assetResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/${body.resourceType}/upload/${encodeURIComponent(body.publicId)}`,
      {
        headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` },
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json({ error: "Unable to verify the uploaded portfolio media." }, { status: 502 });
  }
  const assetResult = await assetResponse.json().catch(() => null) as {
    public_id?: string;
    version?: number;
    secure_url?: string;
    resource_type?: string;
    format?: string;
    bytes?: number;
    duration?: number;
  } | null;
  if (!assetResponse.ok || !assetResult) {
    return NextResponse.json({ error: "Media storage could not verify this upload." }, { status: 502 });
  }
  const actualFormat = assetResult.format?.toLowerCase();
  const actualAllowed = body.resourceType === "image"
    ? actualFormat !== undefined && imageFormats.has(actualFormat)
    : actualFormat !== undefined && videoFormats.has(actualFormat);
  if (
    assetResult.public_id !== body.publicId ||
    assetResult.version !== body.version ||
    assetResult.resource_type !== body.resourceType ||
    assetResult.secure_url !== body.secureUrl ||
    typeof assetResult.format !== "string" ||
    typeof assetResult.bytes !== "number" ||
    assetResult.bytes <= 0 ||
    assetResult.bytes > maximumBytes ||
    !actualAllowed ||
    body.resourceType === "video" && (
      typeof assetResult.duration !== "number" ||
      assetResult.duration <= 0 ||
      assetResult.duration > 60
    )
  ) {
    try {
      await destroyCloudinaryAsset(cloudName, apiKey, apiSecret, body.resourceType, body.publicId);
    } catch (error) {
      console.error(`Cloudinary rejected-upload cleanup failed for ${body.publicId}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    return NextResponse.json({ error: "Use a supported image or video no larger than 10 MB; videos must be 60 seconds or shorter." }, { status: 400 });
  }
  let mediaUrl: URL;
  try {
    mediaUrl = new URL(assetResult.secure_url);
  } catch {
    return NextResponse.json({ error: "Cloud media URL is invalid." }, { status: 400 });
  }
  if (
    mediaUrl.protocol !== "https:" ||
    mediaUrl.hostname !== `${cloudName}.res.cloudinary.com` ||
    !mediaUrl.pathname.includes(`/necnaija/${user.id}/`)
  ) {
    return NextResponse.json({ error: "Uploaded media does not belong to this account." }, { status: 400 });
  }

  const expectedSignature = createHash("sha1")
    .update(`public_id=${body.publicId}&version=${body.version}${apiSecret}`)
    .digest();
  const receivedSignature = Buffer.from(body.signature, "hex");
  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return NextResponse.json({ error: "Cloud media signature could not be verified." }, { status: 400 });
  }

  const publicId = body.publicId;
  const secureUrl = assetResult.secure_url;
  const mediaFormat = assetResult.format.toLowerCase();
  const mediaBytes = assetResult.bytes;
  const mediaDuration = assetResult.duration ?? null;
  let savedId: string;
  try {
    savedId = await getSql().begin(async (transaction) => {
      const [membership] = await transaction<{ user_id: string }[]>`
        select user_id from public.memberships where user_id = ${user.id} for update
      `;
      if (!membership) throw new Error("ACTIVE_MEMBERSHIP_REQUIRED");
      const [count] = await transaction<{ item_count: number }[]>`
        select count(*)::int as item_count from public.member_media where user_id = ${user.id}
      `;
      if ((count?.item_count ?? 0) >= 12) throw new Error("PORTFOLIO_LIMIT");
      await transaction`
      insert into public.artist_profiles (user_id, stage_name, is_public)
      select id, coalesce(nullif(full_name, ''), email), true
      from public.app_users
      where id = ${user.id}
      on conflict (user_id) do update set is_public = true, updated_at = now()
      `;
      await transaction`
      update public.profiles
      set public_profile_enabled = true, updated_at = now()
      where user_id = ${user.id}
      `;
      const [media] = await transaction<{ id: string }[]>`
      insert into public.member_media
        (user_id, public_id, secure_url, resource_type, format, bytes, duration_seconds, is_public)
      values (
        ${user.id},
        ${publicId},
        ${secureUrl},
        ${resourceType},
        ${mediaFormat},
        ${mediaBytes},
        ${resourceType === "video" ? mediaDuration : null},
        true
      )
      returning id
      `;
      return media.id;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PORTFOLIO_LIMIT") {
      return NextResponse.json({ error: "Your portfolio is full. Remove an item before adding more; the limit is 12." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ACTIVE_MEMBERSHIP_REQUIRED") {
      return NextResponse.json({ error: "An active membership is required to publish portfolio media." }, { status: 403 });
    }
    throw error;
  }
  return NextResponse.json({ success: true, id: savedId }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to remove portfolio media." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (typeof body?.id !== "string") {
    return NextResponse.json({ error: "Choose a portfolio item to remove." }, { status: 400 });
  }
  const [media] = await getSql()<{
    public_id: string;
    resource_type: "image" | "video";
  }[]>`
    select public_id, resource_type
    from public.member_media
    where id = ${body.id} and user_id = ${user.id}
  `;
  if (!media) return NextResponse.json({ error: "Portfolio item not found." }, { status: 404 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Portfolio media management is unavailable." }, { status: 503 });
  }
  try {
    await destroyCloudinaryAsset(cloudName, apiKey, apiSecret, media.resource_type, media.public_id);
  } catch {
    return NextResponse.json({ error: "Media storage could not remove this portfolio item." }, { status: 502 });
  }
  await getSql().begin(async (transaction) => {
    await transaction`
      delete from public.member_media where public_id = ${media.public_id} and user_id = ${user.id}
    `;
    await transaction`
      update public.artist_profiles
      set is_public = exists (
        select 1 from public.member_media where user_id = ${user.id} and is_public
      ), updated_at = now()
      where user_id = ${user.id}
    `;
    await transaction`
      update public.profiles
      set public_profile_enabled = exists (
        select 1 from public.member_media where user_id = ${user.id} and is_public
      ), updated_at = now()
      where user_id = ${user.id}
    `;
  });
  return NextResponse.json({ success: true });
}
