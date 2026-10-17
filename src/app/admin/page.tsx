import { redirect } from "next/navigation";
import PortalPreview, {
  type AdminWorkspaceData,
  type PortalApplication,
} from "@/components/portal-preview";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/admin");
  if (!(await userHasPermission(user.id, "admin.access"))) redirect("/");

  const permissions = {
    applications: await userHasPermission(user.id, "applications.review"),
    members: await userHasPermission(user.id, "members.verify"),
    payments: await userHasPermission(user.id, "payments.reconcile"),
    contributionsReview: await userHasPermission(user.id, "contributions.review") ||
      await userHasPermission(user.id, "payments.reconcile"),
    loansReview: await userHasPermission(user.id, "loans.review"),
    publishReports: await userHasPermission(user.id, "reports.publish.national"),
    chaptersManage: await userHasPermission(user.id, "roles.manage") ||
      await userHasPermission(user.id, "settings.manage"),
    campaignsReview: await userHasPermission(user.id, "elections.review"),
    eventsNational: await userHasPermission(user.id, "events.review.national"),
    eventsState: await userHasPermission(user.id, "events.review.state"),
    reports: await userHasPermission(user.id, "reports.view.national"),
    roles: await userHasPermission(user.id, "roles.manage"),
    settings: await userHasPermission(user.id, "settings.manage"),
    support: await userHasPermission(user.id, "support.review"),
    superAdmin: false,
  };
  const sql = getSql();
  const [adminStatus] = await sql<{ is_super_admin: boolean }[]>`
    select exists (
      select 1
      from public.user_role_assignments assignment
      join public.roles role on role.id = assignment.role_id
      where assignment.user_id = ${user.id}
        and role.role_code = 'super_admin'
    ) as is_super_admin
  `;
  permissions.superAdmin = adminStatus.is_super_admin;
  const [
    applications,
    annualRequests,
    campaigns,
    payments,
    pendingContributions,
    loanRequests,
    pendingLoanRepayments,
    contributions,
    events,
    chapters,
    roles,
    roleOptions,
    accounts,
    identityMembers,
    supportTickets,
    dataRequests,
    auditLogs,
    featureFlags,
    summary,
  ] = await Promise.all([
    permissions.applications
      ? sql<PortalApplication[]>`
          select
            application.id,
            application.user_id,
            application.status,
            application.professional_category,
            application.home_state,
            application.submitted_at::text,
            profile.full_name,
            profile.email
          from public.membership_applications application
          join public.profiles profile on profile.user_id = application.user_id
          where application.status in ('submitted', 'needs_information')
          order by application.submitted_at asc
        `
      : [],
    permissions.reports
      ? sql<AdminWorkspaceData["annualRequests"]>`
          select request.id, account.email as user_email, request.report_year,
            request.request_type, request.contribution_balance_minor::text,
            request.rollover_bonus_minor::text, request.allocated_profit_minor::text,
            request.status, request.created_at::text
          from public.annual_member_requests request
          join public.app_users account on account.id = request.user_id
          where request.status in ('submitted', 'under_review')
          order by request.created_at asc
          limit 100
        `
      : [],
    permissions.campaignsReview
      ? sql<AdminWorkspaceData["campaigns"]>`
          select campaign.id, account.email as user_email, campaign.position,
            campaign.chapter_state_code, campaign.election_year, campaign.statement,
            campaign.status, campaign.created_at::text
          from public.management_campaigns campaign
          join public.app_users account on account.id = campaign.user_id
          where campaign.status in ('submitted', 'under_review')
          order by campaign.created_at asc
          limit 100
        `
      : [],
    permissions.payments
      ? sql<AdminWorkspaceData["payments"]>`
          select
            payment.id,
            payment.provider,
            payment.provider_reference,
            payment.amount_minor::text,
            payment.currency,
            payment.status,
            payment.is_demo,
            payment.created_at::text,
            payment.paid_at::text,
            account.email as user_email,
            exists (
              select 1 from public.journal_entries entry
              where entry.source_type = case when payment.is_demo then 'demo_payment' else 'payment' end
                and entry.source_id = payment.id
            ) as has_ledger_entry
          from public.payment_intents payment
          join public.app_users account on account.id = payment.user_id
          order by payment.created_at desc
          limit 100
        `
      : [],
    permissions.contributionsReview
      ? sql<AdminWorkspaceData["pendingContributions"]>`
          select contribution.id, account.email as user_email,
            contribution.contribution_type, contribution.amount_minor::text,
            contribution.contribution_year, contribution.contribution_month,
            contribution.payment_reference, contribution.created_at::text
          from public.member_contributions contribution
          join public.app_users account on account.id = contribution.user_id
          where contribution.status = 'pending'
          order by contribution.created_at asc
          limit 100
        `
      : [],
    permissions.loansReview
      ? sql<AdminWorkspaceData["loanRequests"]>`
          select application.id, account.email as user_email,
            application.project_name, application.amount_minor::text,
            application.purpose, application.requested_repayment_year,
            application.status, application.created_at::text
          from public.member_loan_applications application
          join public.app_users account on account.id = application.user_id
          where application.status in ('submitted', 'under_review', 'approved')
            and not exists (
              select 1 from public.member_loans issued
              where issued.application_id = application.id
            )
          order by application.created_at asc
          limit 100
        `
      : [],
    permissions.loansReview
      ? sql<AdminWorkspaceData["pendingLoanRepayments"]>`
          select repayment.id, repayment.loan_id, repayment.amount_minor::text,
            repayment.payment_reference, repayment.created_at::text,
            loan.outstanding_minor::text, account.email as user_email
          from public.member_loan_repayments repayment
          join public.member_loans loan on loan.id = repayment.loan_id
          join public.app_users account on account.id = repayment.user_id
          where repayment.status = 'pending'
          order by repayment.created_at asc
          limit 100
        `
      : [],
    permissions.payments
      ? sql<AdminWorkspaceData["contributions"]>`
          select
            entry.id,
            entry.description,
            entry.posted_at::text,
            entry.is_demo,
            payment.provider,
            payment.provider_reference,
            payment.amount_minor::text,
            payment.currency,
            account.email as user_email,
            coalesce(
              json_agg(json_build_object(
                'account', ledger.account_name,
                'side', line.side,
                'amount_minor', line.amount_minor::text
              )) filter (where line.id is not null),
              '[]'::json
            ) as lines
          from public.journal_entries entry
          join public.payment_intents payment
            on payment.id = entry.source_id
           and entry.source_type in ('payment', 'demo_payment')
          join public.app_users account on account.id = payment.user_id
          left join public.journal_lines line on line.journal_entry_id = entry.id
          left join public.ledger_accounts ledger on ledger.id = line.ledger_account_id
          group by entry.id, payment.id, account.email
          order by entry.posted_at desc
          limit 100
        `
      : [],
    permissions.eventsNational || permissions.eventsState
      ? sql<AdminWorkspaceData["events"]>`
          select
            event.id,
            event.title,
            event.category,
            event.description,
            event.starts_at::text,
            event.ends_at::text,
            event.state_code,
            chapter.state_name,
            event.venue,
            event.status,
            event.is_public,
            event.created_at::text,
            event.review_target_at::text,
            account.email as creator_email,
            (select review.decision from public.event_reviews review
             where review.event_id = event.id
             order by review.created_at desc limit 1) as last_decision,
            (select review.reason from public.event_reviews review
             where review.event_id = event.id
             order by review.created_at desc limit 1) as last_review_reason
          from public.events event
          left join public.chapters chapter on chapter.state_code = event.state_code
          join public.app_users account on account.id = event.created_by
          where (${permissions.eventsNational} or event.state_code in (
            select chapter_row.state_code
            from public.user_role_assignments assignment
            join public.chapters chapter_row on chapter_row.id = assignment.chapter_id
            where assignment.user_id = ${user.id}
          ))
            and event.status in ('submitted', 'needs_information', 'approved')
          order by event.starts_at asc
          limit 100
        `
      : [],
    permissions.roles || permissions.reports || permissions.chaptersManage
      ? sql<AdminWorkspaceData["chapters"]>`
          select
            chapter.id,
            chapter.state_code,
            chapter.state_name,
            chapter.is_active,
            chapter.created_at::text,
            count(distinct assignment.user_id)::int as coordinator_count,
            count(distinct membership.user_id)::int as member_count
          from public.chapters chapter
          left join public.user_role_assignments assignment
            on assignment.chapter_id = chapter.id
          left join public.memberships membership
            on membership.user_id = assignment.user_id
           and membership.status = 'active'
          group by chapter.id
          order by chapter.state_name
        `
      : [],
    permissions.roles
      ? sql<AdminWorkspaceData["roles"]>`
          select
            assignment.id as assignment_id,
            account.id as user_id,
            account.email,
            account.full_name,
            role.id as role_id,
            role.role_code,
            role.display_name,
            assignment.chapter_id,
            chapter.state_name
          from public.user_role_assignments assignment
          join public.app_users account on account.id = assignment.user_id
          join public.roles role on role.id = assignment.role_id
          left join public.chapters chapter on chapter.id = assignment.chapter_id
          order by account.email, role.display_name
          limit 500
        `
      : [],
    permissions.roles
      ? sql<AdminWorkspaceData["roleOptions"]>`
          select id, role_code, display_name
          from public.roles
          where role_code <> 'super_admin'
            and (${permissions.superAdmin} or role_code <> 'national_admin')
          order by display_name
        `
      : [],
    permissions.roles
      ? sql<AdminWorkspaceData["accounts"]>`
          select id, email, full_name
          from public.app_users
          where is_active
          order by email
          limit 500
        `
      : [],
    permissions.members
      ? sql<AdminWorkspaceData["identityMembers"]>`
          select membership.user_id, membership.member_number, membership.status,
                 membership.activated_at::text, account.email as user_email,
                 account.full_name
          from public.memberships membership
          join public.app_users account on account.id = membership.user_id
          order by membership.activated_at desc
          limit 100
        `
      : [],
    permissions.support
      ? sql<AdminWorkspaceData["supportTickets"]>`
          select ticket.id, ticket.subject, ticket.details, ticket.status, ticket.created_at::text,
                 account.email as user_email
          from public.support_tickets ticket
          join public.app_users account on account.id = ticket.user_id
          order by ticket.created_at desc
          limit 100
        `
      : [],
    permissions.support
      ? sql<AdminWorkspaceData["dataRequests"]>`
          select request.id, request.request_type, request.status, request.details,
                 request.created_at::text, account.email as user_email
          from public.data_requests request
          join public.app_users account on account.id = request.user_id
          order by request.created_at asc
          limit 100
        `
      : [],
    permissions.reports
      ? sql<AdminWorkspaceData["auditLogs"]>`
          select log.id::text, log.action, log.entity_type, log.entity_id::text,
                 log.metadata::text, log.created_at::text, account.email as actor_email
          from public.audit_logs log
          left join public.app_users account on account.id = log.actor_user_id
          order by log.created_at desc
          limit 100
        `
      : [],
    permissions.settings
      ? sql<AdminWorkspaceData["featureFlags"]>`
          select flag.flag_code, flag.enabled, flag.updated_at::text,
                 account.email as updated_by_email
          from public.feature_flags flag
          left join public.app_users account on account.id = flag.updated_by
          order by flag.flag_code
        `
      : [],
    sql<AdminWorkspaceData["summary"][]>`
      select
        (select count(*)::int from public.app_users where is_active) as active_accounts,
        case when ${permissions.members} or ${permissions.reports}
          then (select count(*)::int from public.memberships where status = 'active')
          else null end as active_memberships,
        case when ${permissions.applications}
          then (select count(*)::int from public.membership_applications
            where status in ('submitted', 'needs_information'))
          else null end as pending_applications,
        case when ${permissions.eventsNational}
          then (select count(*)::int from public.events where status = 'submitted')
          when ${permissions.eventsState}
          then (select count(*)::int from public.events event
            where event.status = 'submitted' and event.state_code in (
              select chapter_row.state_code
              from public.user_role_assignments assignment
              join public.chapters chapter_row on chapter_row.id = assignment.chapter_id
              where assignment.user_id = ${user.id}
            ))
          else null end as pending_events,
        case when ${permissions.support}
          then (select count(*)::int from public.support_tickets
            where status in ('open', 'in_progress'))
          else null end as open_support_tickets,
        case when ${permissions.payments}
          then (select count(*)::int from public.payment_intents
            where status = 'succeeded' and not is_demo)
          else null end as verified_payments
    `,
  ]);

  return (
    <PortalPreview
      mode="admin"
      userName={user.email}
      applications={applications}
      adminWorkspace={{
        permissions,
        payments,
        contributions,
        pendingContributions,
        loanRequests,
        pendingLoanRepayments,
        annualRequests,
        campaigns,
        events,
        chapters,
        roles,
        roleOptions,
        accounts,
        identityMembers,
        supportTickets,
        dataRequests,
        auditLogs,
        featureFlags,
        summary: summary[0],
      }}
    />
  );
}
