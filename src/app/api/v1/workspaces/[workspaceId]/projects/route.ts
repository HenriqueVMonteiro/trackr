import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem, validationProblem } from "@/app/api/_problem";
import { CreateProjectBody } from "../../../_schemas";
import { serializeProject } from "../../../_serializers";

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { workspaceId } = await params;
  const { projects } = container();
  const result = await projects.listProjectsForWorkspace.execute({ workspaceId });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({
    items: result.value.map(serializeProject),
    next_cursor: null,
  });
}

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { workspaceId } = await params;
  const json: unknown = await request.json().catch(() => null);
  const parsed = CreateProjectBody.safeParse(json);
  if (!parsed.success) return validationProblem(parsed.error);

  const { projects } = container();
  const result = await projects.createProject.execute({
    actorId: auth.user.id,
    workspaceId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    key: parsed.data.key,
    description: parsed.data.description ?? null,
  });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json(
    { project: serializeProject(result.value.project) },
    { status: 201 },
  );
}
