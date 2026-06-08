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
  const { searchParams } = new URL(request.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");

  const from = fromRaw ? new Date(fromRaw) : new Date(Date.now() - 84 * 24 * 60 * 60 * 1000);
  const to = toRaw ? new Date(toRaw) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json(
      {
        type: "https://trackr.app/errors/validation",
        title: "validation",
        status: 422,
        detail: "from / to must be valid ISO 8601 timestamps",
      },
      { status: 422, headers: { "content-type": "application/problem+json" } },
    );
  }

  const { reports } = container();
  const result = await reports.getProjectThroughput.execute({ projectId, from, to });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({
    project_id: projectId,
    from: from.toISOString(),
    to: to.toISOString(),
    buckets: result.value.map((b) => ({
      week_starting_at: b.weekStartingAt.toISOString(),
      closed_count: b.closedCount,
      canceled_count: b.canceledCount,
    })),
  });
}
