import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validStatuses = new Set(["in_review", "declined"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid data request identifier." }, { status: 400 });
  const body = await request.json().catch(() => null) as { status?: unknown; reason?: unknown } | null;
  if (
    typeof body?.status !== "string" || !validStatuses.has(body.status) ||
    typeof body.reason !== "string" || body.reason.trim().length < 5 || body.reason.length > 1000
  ) {
    return NextResponse.json({ error: "Choose a supported status and provide a reason of at least five characters." }, { status: 400 });
  }
  const status = body.status;
  const reason = body.reason.trim();

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401 });
  if (!(await userHasPermission(user.id, "support.review"))) {
    return NextResponse.json({ error: "You do not have permission to review data requests." }, { status: 403 });
  }

  try {
    await getSql().begin(async (transaction) => {
      const [dataRequest] = await transaction<{ id: string; status: string }[]>`
        select id, status from public.data_requests where id = ${id} for update
      `;
      if (!dataRequest) throw new Error("REQUEST_NOT_FOUND");
      if (dataRequest.status === "completed" || dataRequest.status === "declined") {
        throw new Error("REQUEST_ALREADY_CLOSED");
      }

      await transaction`
        update public.data_requests
        set status = ${status}, updated_at = now()
        where id = ${id}
      `;
      await transaction`
        insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        values (
          ${user.id},
          'data_request.status_updated',
          'data_request',
          ${id},
          ${JSON.stringify({ previous_status: dataRequest.status, status, reason })}::jsonb
        )
      `;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "REQUEST_NOT_FOUND") {
      return NextResponse.json({ error: "Data request not found." }, { status: 404 });
    }
    if (code === "REQUEST_ALREADY_CLOSED") {
      return NextResponse.json({ error: "This data request is already closed." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
