import Link from "next/link";
import { Layout, workspaceTabs } from "@/components/Shell";
import { store } from "@/lib/demo-store";
import { createSprintAction } from "@/app/(client)/_actions";

export const dynamic = "force-dynamic";

export default async function NewSprintPage() {
  const workspace = store.workspace();
  const today = new Date();
  const in14d = new Date(today.getTime() + 14 * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <Layout
      crumbs={[
        { label: workspace.name, href: `/${workspace.slug}` },
        { label: "Sprints", href: `/${workspace.slug}/sprints` },
        { label: "New sprint" },
      ]}
      tabs={workspaceTabs(workspace.slug, "sprints")}
      userName="Henrique"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1.5">Plan a new sprint</h1>
        <p className="muted">
          Cria um sprint <code className="font-mono">planned</code>. Inicia depois clicando
          em "Start" no card; isso transiciona o sprint ativo (se houver) para closed.
        </p>
      </div>
      <form
        action={createSprintAction}
        className="grid gap-4"
        style={{ gridTemplateColumns: "1fr 280px" }}
      >
        <div>
          <label className="block mb-4">
            <span className="field-label">Sprint name</span>
            <input
              name="name"
              className="form-control"
              required
              placeholder="Sprint 8"
              defaultValue={`Sprint ${store.sprints().length + 1}`}
            />
          </label>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="field-label">Start date</span>
              <input
                name="startDate"
                type="date"
                className="form-control"
                required
                defaultValue={fmt(today)}
              />
            </label>
            <label className="block">
              <span className="field-label">End date</span>
              <input
                name="endDate"
                type="date"
                className="form-control"
                required
                defaultValue={fmt(in14d)}
              />
            </label>
          </div>
          <label className="block mb-4">
            <span className="field-label">Committed issues (capacity)</span>
            <input
              name="committed"
              type="number"
              min={0}
              max={100}
              className="form-control"
              defaultValue={10}
              style={{ maxWidth: 160 }}
            />
            <div className="muted text-xs mt-1.5">
              Quantas issues o time se compromete a fechar. Pode ser ajustado depois.
            </div>
          </label>
          <div className="flex justify-end gap-2">
            <Link href={`/${workspace.slug}/sprints`} className="btn btn-sm">
              Cancel
            </Link>
            <button type="submit" className="btn btn-sm btn-primary">
              Create sprint
            </button>
          </div>
        </div>
        <aside>
          <div className="side-section" style={{ paddingTop: 0 }}>
            <div className="side-head">SPRINT STATE</div>
            <div className="muted text-xs leading-5">
              Sprints seguem state machine simples:
              <code className="font-mono block mt-2">
                planned → active → closed
              </code>
              Só um sprint <code className="font-mono">active</code> por vez. Iniciar
              um novo fecha o anterior.
            </div>
          </div>
          <div className="side-section">
            <div className="side-head">VELOCITY</div>
            <div className="muted text-xs leading-5">
              Quando o sprint fechar, o backend calcula velocity = issues done dentro
              da janela do sprint. Servido por{" "}
              <code className="font-mono">GET /api/v1/sprints/&lt;id&gt;/velocity</code>.
            </div>
          </div>
        </aside>
      </form>
    </Layout>
  );
}
