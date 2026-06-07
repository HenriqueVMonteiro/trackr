import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { container } from "@/app/_bootstrap";
import { requireAuth } from "@/app/api/_auth";
import { domainErrorToProblem, validationProblem } from "@/app/api/_problem";
import { CreateLabelBody } from "../../../_schemas";
import { serializeLabel } from "../../../_serializers";

interface Context {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { projectId } = await params;
  const { labels } = container();
  const result = await labels.listLabelsForProject.execute({ projectId });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ items: result.value.map(serializeLabel) });
}

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { projectId } = await params;
  const json: unknown = await request.json().catch(() => null);
  const parsed = CreateLabelBody.safeParse(json);
  if (!parsed.success) return validationProblem(parsed.error);

  const { labels } = container();
  const result = await labels.createLabel.execute({
    actorId: auth.user.id,
    projectId,
    name: parsed.data.name,
    color: parsed.data.color,
  });
  if (!result.ok) return domainErrorToProblem(result.error);
  return NextResponse.json({ label: serializeLabel(result.value) }, { status: 201 });
}
