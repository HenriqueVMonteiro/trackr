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
  const result = await reports.getSprintBurndown.execute({ sprintId });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({
    sprint_id: result.value.sprintId,
    sprint_name: result.value.sprintName,
    total_issues: result.value.totalIssues,
    points: result.value.points.map((p) => ({
      date: p.date.toISOString().slice(0, 10),
      remaining_issues: p.remainingIssues,
    })),
  });
}
