import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem, validationProblem } from "@/app/api/_problem";
import { CreateCommentBody } from "../../../_schemas";
import { serializeComment } from "../../../_serializers";

interface Context {
  params: Promise<{ issueId: string }>;
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { issueId } = await params;
  const { comments } = container();
  const result = await comments.listCommentsForIssue.execute({ issueId });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ items: result.value.map(serializeComment) });
}

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { issueId } = await params;
  const json: unknown = await request.json().catch(() => null);
  const parsed = CreateCommentBody.safeParse(json);
  if (!parsed.success) return validationProblem(parsed.error);

  const { comments } = container();
  const result = await comments.createComment.execute({
    actorId: auth.user.id,
    issueId,
    body: parsed.data.body,
  });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ comment: serializeComment(result.value) }, { status: 201 });
}
