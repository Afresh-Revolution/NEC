import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const chapterRoleCodes = new Set(["state_coordinator", "state_committee"]);
const elevatedRoleCodes = new Set(["national_admin", "super_admin"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    userId?: unknown;
    roleId?: unknown;
    chapterId?: unknown;
  } | null;
  if (
    !body ||
    !isUuid(body.userId) ||
    !isUuid(body.roleId) ||
    (body.chapterId !== null && body.chapterId !== undefined && !isUuid(body.chapterId))
  ) {
    return NextResponse.json({ error: "Select a valid account, role and optional chapter." }, { status: 400 });
  }
  const targetUserId = body.userId;
  const targetRoleId = body.roleId;
  const chapterId: string | null = typeof body.chapterId === "string" ? body.chapterId : null;

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401 });
  if (!(await userHasPermission(user.id, "roles.manage"))) {
    return NextResponse.json({ error: "You do not have permission to manage roles." }, { status: 403 });
  }

  try {
    const result = await getSql().begin(async (transaction) => {
      const [actor] = await transaction<{ super_admin: boolean }[]>`
        select exists (
          select 1
          from public.user_role_assignments assignment
          join public.roles role on role.id = assignment.role_id
          where assignment.user_id = ${user.id}
            and role.role_code = 'super_admin'
        ) as super_admin
      `;
      const [targetAccount] = await transaction<{ id: string }[]>`
        select id from public.app_users
        where id = ${targetUserId} and is_active
      `;
      if (!targetAccount) throw new Error("ACCOUNT_NOT_FOUND");
      if (targetAccount.id === user.id) throw new Error("SELF_ASSIGNMENT");

      const [role] = await transaction<{ id: string; role_code: string }[]>`
        select id, role_code from public.roles where id = ${targetRoleId}
      `;
      if (!role || role.role_code === "super_admin") throw new Error("ROLE_NOT_ASSIGNABLE");
      if (elevatedRoleCodes.has(role.role_code) && !actor.super_admin) {
        throw new Error("SUPER_ADMIN_REQUIRED");
      }

      if (chapterRoleCodes.has(role.role_code) !== Boolean(chapterId)) {
        throw new Error("CHAPTER_SCOPE_REQUIRED");
      }
      if (chapterId) {
        const [chapter] = await transaction<{ id: string }[]>`
          select id from public.chapters where id = ${chapterId}
        `;
        if (!chapter) throw new Error("CHAPTER_NOT_FOUND");
      }

      const [assignment] = await transaction<{ id: string }[]>`
        insert into public.user_role_assignments (user_id, role_id, chapter_id, assigned_by)
        values (${targetAccount.id}, ${role.id}, ${chapterId}, ${user.id})
        on conflict do nothing
        returning id
      `;
      if (!assignment) throw new Error("ASSIGNMENT_EXISTS");

      await transaction`
        insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        values (
          ${user.id},
          'role.assignment_created',
          'user',
          ${targetAccount.id},
          ${JSON.stringify({ role_code: role.role_code, chapter_id: chapterId })}::jsonb
        )
      `;
      return assignment.id;
    });
    return NextResponse.json({ success: true, assignmentId: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const errors: Record<string, { message: string; status: number }> = {
      ACCOUNT_NOT_FOUND: { message: "The selected account is unavailable.", status: 404 },
      SELF_ASSIGNMENT: { message: "Administrators cannot change their own role assignments here.", status: 400 },
      ROLE_NOT_ASSIGNABLE: { message: "That role cannot be assigned from this workspace.", status: 400 },
      SUPER_ADMIN_REQUIRED: { message: "Only a super administrator can grant or remove national administrator access.", status: 403 },
      CHAPTER_SCOPE_REQUIRED: { message: "State coordinator and committee roles require exactly one chapter.", status: 400 },
      CHAPTER_NOT_FOUND: { message: "The selected chapter was not found.", status: 404 },
      ASSIGNMENT_EXISTS: { message: "That account already has this role in the selected scope.", status: 409 },
    };
    const known = errors[code];
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    throw error;
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null) as { assignmentId?: unknown } | null;
  if (!body || !isUuid(body.assignmentId)) {
    return NextResponse.json({ error: "Select a valid role assignment." }, { status: 400 });
  }
  const assignmentId = body.assignmentId;

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401 });
  if (!(await userHasPermission(user.id, "roles.manage"))) {
    return NextResponse.json({ error: "You do not have permission to manage roles." }, { status: 403 });
  }

  try {
    await getSql().begin(async (transaction) => {
      const [actor] = await transaction<{ super_admin: boolean }[]>`
        select exists (
          select 1
          from public.user_role_assignments assignment
          join public.roles role on role.id = assignment.role_id
          where assignment.user_id = ${user.id}
            and role.role_code = 'super_admin'
        ) as super_admin
      `;
      const [assignment] = await transaction<{
        id: string;
        user_id: string;
        role_code: string;
      }[]>`
        select assignment.id, assignment.user_id, role.role_code
        from public.user_role_assignments assignment
        join public.roles role on role.id = assignment.role_id
        where assignment.id = ${assignmentId}
        for update
      `;
      if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
      if (assignment.user_id === user.id) throw new Error("SELF_ASSIGNMENT");
      if (assignment.role_code === "super_admin") throw new Error("ROLE_NOT_ASSIGNABLE");
      if (elevatedRoleCodes.has(assignment.role_code) && !actor.super_admin) {
        throw new Error("SUPER_ADMIN_REQUIRED");
      }

      await transaction`
        delete from public.user_role_assignments where id = ${assignment.id}
      `;
      await transaction`
        insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        values (
          ${user.id},
          'role.assignment_removed',
          'user',
          ${assignment.user_id},
          ${JSON.stringify({ role_code: assignment.role_code })}::jsonb
        )
      `;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const errors: Record<string, { message: string; status: number }> = {
      ASSIGNMENT_NOT_FOUND: { message: "Role assignment not found.", status: 404 },
      SELF_ASSIGNMENT: { message: "Administrators cannot change their own role assignments here.", status: 400 },
      ROLE_NOT_ASSIGNABLE: { message: "Super-administrator assignments cannot be changed here.", status: 403 },
      SUPER_ADMIN_REQUIRED: { message: "Only a super administrator can grant or remove national administrator access.", status: 403 },
    };
    const known = errors[code];
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    throw error;
  }

  return NextResponse.json({ success: true });
}
