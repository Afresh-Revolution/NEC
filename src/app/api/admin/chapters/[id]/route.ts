import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid chapter identifier." }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as { isActive?: unknown } | null;
  if (typeof body?.isActive !== "boolean") {
    return NextResponse.json({ error: "Choose whether this chapter should be active." }, { status: 400 });
  }
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in with chapter management access." }, { status: 401 });
  const permitted = await userHasPermission(user.id, "roles.manage") ||
    await userHasPermission(user.id, "settings.manage");
  if (!permitted) return NextResponse.json({ error: "You are not authorised to manage chapters." }, { status: 403 });

  const [chapter] = await getSql()<{ id: string; state_name: string }[]>`
    update public.chapters
    set is_active = ${body.isActive}
    where id = ${id}
    returning id, state_name
  `;
  if (!chapter) return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  await getSql()`
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (${user.id}, ${body.isActive ? "chapter.activated" : "chapter.deactivated"},
      'chapter', ${id}, ${JSON.stringify({ stateName: chapter.state_name })}::jsonb)
  `;
  return NextResponse.json({ success: true, isActive: body.isActive });
}
