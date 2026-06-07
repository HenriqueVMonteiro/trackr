import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem } from "@/app/api/_problem";
import { serializeWorkspace } from "../../_serializers";

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { workspaceId } = await params;
  const { workspaces } = container();
  const result = await workspaces.getWorkspace.execute({
    actorId: auth.user.id,
    workspaceId,
  });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ workspace: serializeWorkspace(result.value) });
}
