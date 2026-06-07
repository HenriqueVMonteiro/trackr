import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem, validationProblem } from "@/app/api/_problem";
import { EditIssueBody } from "../../_schemas";
import { serializeIssue } from "../../_serializers";

interface Context {
  params: Promise<{ issueId: string }>;
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { issueId } = await params;
  const { issues } = container();
  const result = await issues.getIssue.execute({ issueId });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ issue: serializeIssue(result.value) });
}

export async function PATCH(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { issueId } = await params;
  const json: unknown = await request.json().catch(() => null);
  const parsed = EditIssueBody.safeParse(json);
  if (!parsed.success) return validationProblem(parsed.error);

  const { issues } = container();
  const result = await issues.editIssue.execute({
    actorId: auth.user.id,
    issueId,
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description }
      : {}),
  });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ issue: serializeIssue(result.value) });
}
