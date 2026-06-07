export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Trackr</h1>
      <p style={{ color: "#555" }}>
        Issue tracker modular em construção — trabalho final de Arquitetura de Software.
      </p>
      <h2 style={{ fontSize: "1.25rem", marginTop: "2rem" }}>Documentação</h2>
      <ul>
        <li>
          <code>HANDOFF.md</code> — contrato entre os agentes paralelos
        </li>
        <li>
          <code>docs/superpowers/specs/</code> — design completo
        </li>
        <li>
          <code>adrs/</code> — Architecture Decision Records
        </li>
        <li>
          <code>diagrams/</code> — diagramas C4, classes, sequência
        </li>
      </ul>
      <p style={{ color: "#888", marginTop: "2rem", fontSize: "0.875rem" }}>
        UI completa será implementada no stint B11.
      </p>
    </main>
  );
}
