# Orça Fácil Fase 2 — Lista de Tarefas

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Migrations 011–015: schema da Fase 2 | completed | low | — |
| 02 | JSON de fallback do catálogo regional | completed | low | — |
| 03 | Templates de e-mail: aprovação, follow-up e vencimento | completed | medium | — |
| 04 | Approval token: PATCH e GET de orçamento estendidos | completed | medium | task_01 |
| 05 | Rota pública /o/[token] + endpoint POST /approve | completed | high | task_01, task_03, task_04 |
| 06 | GET /api/alerts + badge de alertas in-app no layout | completed | medium | task_01 |
| 07 | Calculadora de chapas embutida no wizard | completed | low | task_01 |
| 08 | Routes de fotos de ambiente (upload e exclusão) | completed | medium | task_01 |
| 09 | UI de upload de fotos no wizard + PDF com fotos | completed | medium | task_07, task_08 |
| 10 | Modelo de mensagem WhatsApp editável no wizard | completed | medium | task_04 |
| 11 | Configurações ampliadas (profile + tela de configurações) | completed | medium | task_01 |
| 12 | Alerta de preços desatualizados (catálogo + wizard) | completed | medium | task_01 |
| 13 | Dashboard de conversão | completed | medium | task_01 |
| 14 | Cron de notificações diárias unificado | completed | medium | task_01, task_03 |
| 15 | Endpoints + tela de onboarding do catálogo regional | completed | medium | task_01, task_02 |
