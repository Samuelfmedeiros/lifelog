name: yurumi-auto-auditoria-segura-de-codigo
description: Audita código aplicando apenas correções inequívocas e de baixo risco, documentando achados graves e sem realizar commits automáticos.
tags: [auditoria, codigo, revisao, seguranca]
source: yurumi-auto
generated_at: 2026-10-24T01:50:07.841237+00:00

## Objetivo

Conduzir auditorias de código no repositório Lifelog aplicando correções apenas em itens inequívocos e de baixo risco, documentando achados graves para decisão do dono, sem realizar commits automáticos. Mantém a estabilidade da infraestrutura compartilhada e respeita o território operacional de outras sessões.

## Passos

1. **Levantamento de escopo** — identifique os arquivos, pastas ou componentes a auditar (segurança, qualidade, performance, acessibilidade). Confirme se não há trabalho de outra sessão em andamento nos mesmos arquivos; se houver, não toque.
2. **Análise estática** — execute lint (`pnpm exec eslint`), tipo (`pnpm exec tsc --noEmit`) e build (`pnpm build`) para mapear problemas existentes antes de qualquer alteração.
3. **Classificação de risco** — separe achados em: (a) inequívocos e de baixo risco (ex.: tipagem óbvia, import inutilizado, contraste abaixo do mínimo, semântica HTML errada) e (b) graves ou ambíguos (ex.: mudança de lógica de negócio, alteração de API pública, remoção de dependência, correção de segurança crítica).
4. **Correção segura** — aplique apenas correções do grupo (a), uma por vez, com diff pequeno e reversível. Não altere arquivos de outra sessão nem arquivos de configuração compartilhada sem confirmação.
5. **Documentação de achados graves** — registre cada achado do grupo (b) em um relatório de auditoria com: arquivo, linha, problema, impacto, sugestão de correção e por que não foi corrigido automaticamente. Não commite alterações decorrentes de achados graves.
6. **Validação pós-correção** — reexecute lint, tipo e build para confirmar que nada foi quebrado. Se houver regressão, reverte imediatamente.
7. **Registro de decisão** — anexe o relatório de auditoria (achados corrigidos + achados graves documentados) ao AGENTS.md ou CHANGELOG.md da sessão, conforme o padrão de fim de dia do Samuel.
8. **Sem commit automático** — deixe as correções prontas para revisão do dono. O dono decide quando e se commita/pushe.
