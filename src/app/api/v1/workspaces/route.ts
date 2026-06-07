import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem, validationProblem } from "@/app/api/_problem";
import { CreateWorkspaceBody } from "../_schemas";
import { serializeWorkspace } from "../_serializers";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { workspaces } = container();
  const result = await workspaces.listWorkspacesForUser.execute({ userId: auth.user.id });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({
    items: result.value.map(serializeWorkspace),
    next_cursor: null,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const json: unknown = await request.json().catch(() => null);
  const parsed = CreateWorkspaceBody.safeParse(json);
  if (!parsed.success) return validationProblem(parsed.error);

  const { workspaces } = container();
  const result = await workspaces.createWorkspace.execute({
    name: parsed.data.name,
    slug: parsed.data.slug,
    ownerId: auth.user.id,
  });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json(
    { workspace: serializeWorkspace(result.value.workspace) },
    { status: 201 },
  );
}
