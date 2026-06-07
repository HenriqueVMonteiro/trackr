import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem, validationProblem } from "@/app/api/_problem";
import { TransitionIssueBody } from "../../../_schemas";
import { serializeIssue } from "../../../_serializers";

interface Context {
  params: Promise<{ issueId: string }>;
}

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { issueId } = await params;
  const json: unknown = await request.json().catch(() => null);
  const parsed = TransitionIssueBody.safeParse(json);
  if (!parsed.success) return validationProblem(parsed.error);

  const { issues } = container();
  const result = await issues.transitionIssue.execute({
    actorId: auth.user.id,
    issueId,
    to: parsed.data.to,
  });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ issue: serializeIssue(result.value) }, { status: 200 });
}
