import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem } from "@/app/api/_problem";
import { serializeActivity } from "../../../_serializers";

interface Context {
  params: Promise<{ issueId: string }>;
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { issueId } = await params;
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200) : 50;

  const { issues } = container();
  const result = await issues.listActivityForIssue.execute({ issueId, limit });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ items: result.value.map(serializeActivity) });
}
