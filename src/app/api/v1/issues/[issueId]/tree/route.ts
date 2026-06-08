import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem } from "@/app/api/_problem";
import { serializeIssue } from "../../../_serializers";
import type { IssueTree } from "@/modules/issues/domain/IssueTree";

interface Context {
  params: Promise<{ issueId: string }>;
}

// Inline tree serializer kept here to avoid touching shared _serializers.ts
// while Agent B is concurrently extending it for webhooks/notifications/etc.
function serializeIssueTree(t: IssueTree): {
  issue: ReturnType<typeof serializeIssue>;
  children: ReturnType<typeof serializeIssueTree>[];
  size: number;
  depth: number;
  progressPercent: number;
} {
  return {
    issue: serializeIssue(t.root),
    children: t.children.map(serializeIssueTree),
    size: t.size(),
    depth: t.depth(),
    progressPercent: t.progressPercent(),
  };
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { issueId } = await params;
  const { searchParams } = new URL(request.url);
  const maxDepthRaw = searchParams.get("max_depth");
  const maxDepth = maxDepthRaw
    ? Math.min(Math.max(parseInt(maxDepthRaw, 10) || 10, 1), 20)
    : 10;

  const { issues } = container();
  const result = await issues.getIssueTree.execute({ issueId, maxDepth });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ tree: serializeIssueTree(result.value) });
}
