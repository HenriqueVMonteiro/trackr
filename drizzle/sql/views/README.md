# Materialized views — referência de produção

Estas views documentam o **shape de produção** dos relatórios servidos pelo
módulo `src/modules/reports/`. Hoje o `DrizzleReportReader` executa as
agregações em runtime (custo aceitável para o volume acadêmico). Quando o
projeto sair do MVP e issues/sprints crescerem, estas views podem ser
**promovidas a materialized views** com refresh agendado por worker BullMQ
(ver [ADR-0006](../../../adrs/0006-bullmq-vs-inngest-vs-vercel-cron.md)).

## Estratégia de promoção

1. Aplicar uma das migrations abaixo via `psql`/`drizzle-kit push`
2. Criar índice no(s) campo(s) de filtro mais usados (`project_id`,
   `week_starting_at`)
3. Trocar o `DrizzleReportReader` para apontar para a view materializada
   (uma linha de diff por método)
4. Agendar `REFRESH MATERIALIZED VIEW CONCURRENTLY <name>` a cada 5–15 min
   no worker

A escolha entre runtime query agora vs MV é deliberada — runtime mantém
sempre fresco, MV reduz latência sob volume. Compatível com SOLID/OCP:
substituir adapter é trivial.

## Files

- `dashboard_throughput.sql` — issues fechadas/canceladas por semana
- `dashboard_cycle_time.sql` — tempo de vida das issues resolvidas
- `dashboard_status_distribution.sql` — contagem por status

## Dependencies

Por enquanto só dependem da tabela `issues`. Quando o módulo `sprints`
(stint B6) entrar em main, novas views serão adicionadas aqui:

- `dashboard_velocity.sql` — story points done por sprint
- `dashboard_burndown.sql` — remaining work ao longo do sprint
