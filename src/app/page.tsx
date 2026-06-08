import Link from "next/link";
import React from "react";

import { LogoIcon } from "@/components/icons";

const metrics = [
  ["<2s", "para criar uma issue"],
  ["5 min", "para migrar do Jira"],
  ["0", "horas de treinamento"],
  ["100%", "keyboard-first"],
] as const;

const comparisonRows = [
  ["Criar uma issue", "Um atalho, 2 segundos", "Modal com campos obrigatorios"],
  ["Curva de aprendizado", "Minutos, sem manual", "Semanas e treinamento"],
  ["Velocidade da interface", "Instantanea, keyboard-first", "Recarregamentos e spinners"],
  ["Workflow de status", "State machine clara e visual", "Schemes e permissoes sem fim"],
  ["Dashboards e relatorios", "Prontos, sem setup", "Plugins pagos e JQL"],
  ["Preco", "Transparente e previsivel", "Cresce a cada add-on"],
] as const;

const features = [
  {
    title: "Rapido como pensar",
    body: "Cada acao e um atalho. Criar, transicionar, comentar e atribuir sem tirar as maos do teclado e sem esperar a tela recarregar.",
    items: ["Paleta de comandos em tudo", "Navegacao 100% por teclado", "Interface instantanea"],
    visual: "shortcuts",
  },
  {
    title: "Um fluxo que faz sentido",
    body: "Status sao uma maquina de estados visual e clara, nao um labirinto de workflow schemes. Todo mundo entende para onde a issue pode ir.",
    items: ["Transicoes validas sempre a vista", "Regras de aprovacao embutidas", "Activity log completo"],
    visual: "pipeline",
  },
  {
    title: "Relatorios na hora",
    body: "Throughput, cycle time, distribuicao de status e velocity de sprint vem prontos. Sem JQL, sem add-ons pagos, sem configurar queries.",
    items: ["Cycle time com p50 e p90", "Throughput semanal automatico", "Velocity de sprint sem esforco"],
    visual: "reports",
  },
] as const;

function Tick({ negative }: { negative?: boolean }) {
  return (
    <span className={`landing-tick ${negative ? "landing-tick-no" : "landing-tick-yes"}`} aria-hidden="true">
      {negative ? "x" : "✓"}
    </span>
  );
}

function ProductMock() {
  const rows = [
    ["in review", "Sub-tasks + ActivitySnapshot", "#8250df", "HM"],
    ["in progress", "EventBus dispatcher + outbox relay", "#bf8700", "HM"],
    ["domain", "Modulos comments + labels", "#0969da", "LN"],
    ["adr", "OpenAPI 3.1 a partir dos schemas Zod", "#818b98", "GC"],
    ["gof:state", "Workflow de Issue como GoF State", "#199a5a", "GC"],
  ] as const;

  return (
    <div className="landing-mock-frame" aria-label="Mockup da interface do Trackr">
      <div className="landing-mock-top">
        <span className="landing-mock-dots" aria-hidden="true">
          <i style={{ background: "#ec6a5e" }} />
          <i style={{ background: "#f4bf4f" }} />
          <i style={{ background: "#61c554" }} />
        </span>
        <span className="landing-mock-url">app.trackr.dev/trackr/projects/core-domain</span>
      </div>
      <div className="landing-mock-body">
        <aside className="landing-mock-side">
          <span className="landing-mock-side-item landing-active">
            <i style={{ background: "#6e56cf" }} /> Issues
          </span>
          <span className="landing-mock-side-item">
            <i style={{ background: "#199a5a" }} /> Dashboard
          </span>
          <span className="landing-mock-side-item">
            <i style={{ background: "#bf8700" }} /> Sprints
          </span>
          <span className="landing-mock-side-group">Projetos</span>
          <span className="landing-mock-side-item">
            <i style={{ background: "#1f883d" }} /> Core Domain
          </span>
          <span className="landing-mock-side-item">
            <i style={{ background: "#8250df" }} /> Platform & Infra
          </span>
          <span className="landing-mock-side-item">
            <i style={{ background: "#0969da" }} /> Client UI
          </span>
        </aside>
        <div className="landing-mock-main">
          <div className="landing-mock-heading">
            <h2>Core Domain</h2>
            <span>12 abertas</span>
          </div>
          {rows.map(([tag, title, color, avatar]) => (
            <div className="landing-mock-row" key={title}>
              <i className="landing-mock-status" style={{ borderColor: color, background: color }} />
              <strong>{title}</strong>
              <span className="landing-mock-tag">{tag}</span>
              <span className="landing-mock-priority" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="landing-mock-avatar">{avatar}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ type }: { type: (typeof features)[number]["visual"] }) {
  if (type === "pipeline") {
    return (
      <div className="landing-pipeline">
        {["Backlog", "Todo", "In progress", "In review", "Done"].map((status, index) => (
          <span className="landing-pipeline-step" key={status}>
            <span>{status}</span>
            {index < 4 && <i aria-hidden="true">→</i>}
          </span>
        ))}
        <p>
          <strong>In review → Done</strong> exige aprovador definido.
        </p>
      </div>
    );
  }

  if (type === "reports") {
    return (
      <div>
        <div className="landing-report-cards">
          <div>
            <span>Cycle time</span>
            <strong>2.8d</strong>
            <small>p50 2.1d · p90 5.4d</small>
          </div>
          <div>
            <span>Fechadas / semana</span>
            <strong className="landing-green">9</strong>
            <small>+50% vs. semana anterior</small>
          </div>
        </div>
        <div className="landing-bars" aria-hidden="true">
          {[24, 42, 64, 100, 70].map((height) => (
            <i key={height} style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="landing-shortcuts">
      <p>
        <kbd>C</kbd> nova issue <kbd>/</kbd> buscar <kbd>A</kbd> atribuir
      </p>
      <div>
        <i className="landing-mock-status" style={{ borderColor: "#bf8700", background: "#bf8700" }} />
        <strong>Notifications: Factory Method multi-canal</strong>
        <span className="landing-mock-tag">infra</span>
      </div>
      <small>
        <kbd>↵</kbd> transicionado para <strong>In review</strong> agora
      </small>
    </div>
  );
}

export default function Home() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Principal">
        <div className="landing-container landing-nav-inner">
          <Link className="landing-brand" href="#top">
            <LogoIcon size={28} color="#6e56cf" />
            <span>Trackr</span>
          </Link>
          <div className="landing-nav-links">
            <Link href="#por-que">Por que Trackr</Link>
            <Link href="#recursos">Recursos</Link>
            <Link href="#fluxo">Fluxo</Link>
            <Link href="#precos">Precos</Link>
          </div>
          <div className="landing-nav-actions">
            <Link className="landing-signin" href="/login">
              Entrar
            </Link>
            <Link className="landing-btn landing-btn-primary landing-btn-sm" href="/register">
              Comecar gratis
            </Link>
          </div>
        </div>
      </nav>

      <header className="landing-hero" id="top">
        <div className="landing-container">
          <span className="landing-eyebrow">O rastreador de issues moderno</span>
          <h1>
            Acompanhe o trabalho.
            <br />
            <span>Sem o peso do Jira.</span>
          </h1>
          <p className="landing-hero-copy">
            Trackr da ao seu time issues, sprints e dashboards num app rapido e keyboard-first que se aprende
            em minutos, nao em treinamentos de uma semana.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-btn landing-btn-primary landing-btn-lg" href="/register">
              Comecar gratis
            </Link>
            <Link className="landing-btn landing-btn-ghost landing-btn-lg" href="/trackr">
              Ver demo ao vivo
            </Link>
          </div>
          <div className="landing-hero-trust">
            <span>
              <Tick /> Sem cartao de credito
            </span>
            <span>
              <Tick /> Migracao do Jira em 1 clique
            </span>
            <span>
              <Tick /> Plano gratuito para sempre
            </span>
          </div>
          <ProductMock />
        </div>
      </header>

      <section className="landing-metrics" aria-label="Metricas do Trackr">
        <div className="landing-container landing-metrics-grid">
          {metrics.map(([value, label]) => (
            <div className="landing-metric" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="por-que">
        <div className="landing-container">
          <div className="landing-section-head">
            <span className="landing-eyebrow">Trackr vs. Jira</span>
            <h2>Por que times trocam o Jira pelo Trackr</h2>
            <p>O Jira faz tudo depois de meses de configuracao. O Trackr faz o que importa e funciona no primeiro dia.</p>
          </div>
          <div className="landing-compare-table">
            <div className="landing-compare-head">
              <span>Capacidade</span>
              <strong>Trackr</strong>
              <strong>Jira</strong>
            </div>
            {comparisonRows.map(([feature, trackr, jira]) => (
              <div className="landing-compare-row" key={feature}>
                <strong>{feature}</strong>
                <span>
                  <Tick /> {trackr}
                </span>
                <span>
                  <Tick negative /> {jira}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-features" id="recursos">
        <div className="landing-container">
          {features.map((feature, index) => (
            <article className={`landing-feature-row ${index === 1 ? "landing-feature-flip" : ""}`} key={feature.title} id={feature.visual === "pipeline" ? "fluxo" : undefined}>
              <div className="landing-feature-copy">
                <span className="landing-feature-icon" aria-hidden="true">
                  {index + 1}
                </span>
                <h2>{feature.title}</h2>
                <p>{feature.body}</p>
                <ul>
                  {feature.items.map((item) => (
                    <li key={item}>
                      <Tick /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="landing-feature-visual">
                <FeatureVisual type={feature.visual} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-quote">
        <div className="landing-container">
          <blockquote>
            "Migramos 1.200 issues do Jira numa tarde. Em uma semana, ninguem da equipe queria voltar."
          </blockquote>
          <div className="landing-quote-by">
            <span>RM</span>
            <p>
              <strong>Rafaela Martins</strong>
              <small>Engineering Lead · time de plataforma</small>
            </p>
          </div>
        </div>
      </section>

      <section className="landing-cta" id="precos">
        <div className="landing-container">
          <span className="landing-eyebrow">Comece hoje</span>
          <h2>
            Pronto para deixar
            <br /> o Jira para tras?
          </h2>
          <p>Plano gratuito para sempre para times pequenos. Sem cartao, sem treinamento, sem dor de cabeca.</p>
          <div className="landing-hero-actions">
            <Link className="landing-btn landing-btn-on-dark landing-btn-lg" href="/register">
              Comecar gratis
            </Link>
            <Link className="landing-btn landing-btn-outline-dark landing-btn-lg" href="/trackr">
              Ver demo ao vivo
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-grid">
          <div>
            <Link className="landing-brand" href="#top">
              <LogoIcon size={26} color="#a995f2" />
              <span>Trackr</span>
            </Link>
            <p>Issue tracker modular, rapido e keyboard-first. Toda a forca de um Jira, sem o peso.</p>
          </div>
          <div>
            <h3>Produto</h3>
            <Link href="/trackr">Issues</Link>
            <Link href="/trackr/sprints">Sprints</Link>
            <Link href="/trackr/dashboard">Dashboards</Link>
          </div>
          <div>
            <h3>Recursos</h3>
            <Link href="#por-que">Trackr vs. Jira</Link>
            <Link href="#recursos">Funcionalidades</Link>
            <Link href="#fluxo">Workflow</Link>
          </div>
          <div>
            <h3>Conta</h3>
            <Link href="/login">Entrar</Link>
            <Link href="/register">Criar conta</Link>
            <Link href="/trackr">Demo</Link>
          </div>
        </div>
        <div className="landing-container landing-footer-bottom">
          <span>© 2026 Trackr · Arquitetura de Software</span>
          <span>Feito para times que enviam.</span>
        </div>
      </footer>
    </main>
  );
}
