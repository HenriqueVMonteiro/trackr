import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem } from "@/app/api/_problem";

interface Context {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { projectId } = await params;
  const { reports } = container();
  const result = await reports.getProjectStatusDistribution.execute({ projectId });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({
    project_id: result.value.projectId,
    total: result.value.total,
    counts: result.value.counts,
  });
}
