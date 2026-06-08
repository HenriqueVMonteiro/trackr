import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem } from "@/app/api/_problem";

interface Context {
  params: Promise<{ sprintId: string }>;
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { sprintId } = await params;
  const { reports } = container();
  const result = await reports.getSprintVelocity.execute({ sprintId });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({
    sprint_id: result.value.sprintId,
    sprint_name: result.value.sprintName,
    committed_issues: result.value.committedIssues,
    completed_issues: result.value.completedIssues,
  });
}
