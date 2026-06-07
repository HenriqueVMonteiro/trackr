import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem, validationProblem } from "@/app/api/_problem";
import { CreateIssueBody, IssueStatusEnum, IssuePriorityEnum } from "../../../_schemas";
import { serializeIssue } from "../../../_serializers";
import type { IssueStatus, IssuePriority } from "@/modules/issues";

interface Context {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200) : 50;
  const cursor = searchParams.get("cursor") ?? undefined;
  const statusParams = searchParams.getAll("status");
  const priorityParams = searchParams.getAll("priority");

  const statusFilter = statusParams.filter(
    (s): s is IssueStatus => IssueStatusEnum.safeParse(s).success,
  );
  const priorityFilter = priorityParams.filter(
    (p): p is IssuePriority => IssuePriorityEnum.safeParse(p).success,
  );

  const { issues } = container();
  const result = await issues.listIssuesForProject.execute({
    projectId,
    filter: {
      ...(statusFilter.length > 0 ? { status: statusFilter } : {}),
      ...(priorityFilter.length > 0 ? { priority: priorityFilter } : {}),
    },
    page: { cursor, limit },
  });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({
    items: result.value.items.map(serializeIssue),
    next_cursor: result.value.nextCursor,
  });
}

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { projectId } = await params;
  const json: unknown = await request.json().catch(() => null);
  const parsed = CreateIssueBody.safeParse(json);
  if (!parsed.success) return validationProblem(parsed.error);

  const { issues } = container();
  const result = await issues.createIssue.execute({
    actorId: auth.user.id,
    projectId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    priority: parsed.data.priority,
    assigneeId: parsed.data.assigneeId ?? null,
    parentId: parsed.data.parentId ?? null,
  });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ issue: serializeIssue(result.value.issue) }, { status: 201 });
}
