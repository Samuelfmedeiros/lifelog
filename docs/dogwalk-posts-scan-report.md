# Relatório de Escaneamento — Posts Dogwalk/PataPass

**Data:** 2026-07-16  
**Arquivos escaneados:** 7 posts MDX  

---

## 1. 🚩 ERRO NUMÉRICO — Gap demanda/oferta calculado errado

**Arquivo:** `dogwalk-a-primeira-ideia-do-marketplace-de-pets.mdx`  
**Linha:** 49-51

```python
gap = (donos_ativos * 3) / (ociosos * 10)
print(f"Razão demanda/oferta: {gap:.1f}x")
# → 3.4x — cada profissional podia atender 3x mais
```

**Problema:** O resultado real da conta é **1.71x**, não 3.4x.

| Variável | Valor |
|---|---|
| donos_ativos | 1000 × 0.73 = 730 |
| ociosos | 200 × 0.64 = 128 |
| gap real | (730 × 3) / (128 × 10) = **1.71** |

O comentário e a frase "cada profissional podia atender 3x mais" estão incorretos.

**Severidade:** 🔴 Médio — o erro está no resultado de um cálculo comentado, não quebra o post, mas o número é factualmente errado.

---

## 2. 🚩 INCONSISTÊNCIA — Porta do backend FastAPI

**Arquivos:** múltiplos  
**Problema:** O backend FastAPI é referenciado em portas diferentes sem explicação.

| Post | Porta | Linha |
|------|-------|-------|
| `fastapi-react-por-que-escolhi-essa-stack-pro-dogwalk.mdx` | **8000** | 194, 311 |
| `primeiro-deploy-do-dogwalk-vite-cloudflare-pages.mdx` | **8000** | 70 |
| `primeiros-passos-infra-dogwalk.mdx` | **8080** | 213, 257 |
| `inicio-dogwalk-marketplace-pets.mdx` | **8080** | 229 |

A própria `primeiros-passos-infra` linha 256 mostra `uvicorn ... --port 8080`, mas na linha 257 o terminal curl aponta pra `:8080`. Já no post `fastapi-react` linha 309, o comando é `uvicorn ... --port 8000`.

Parece que o backend rodou em portas diferentes em momentos diferentes, mas não há explicação contextual para a diferença.

**Severidade:** 🟡 Leve — portas de dev mudam, mas dentro da mesma linha do tempo narrativa fica confuso.

---

## 3. 🚩 INCONSISTÊNCIA — Versão do Vite

**Arquivos:** múltiplos  
**Problema:** 3 posts dizem "Vite 8", mas um terminal mostra "VITE v6.2.0".

| Post | Versão mencionada | Linha |
|------|-------------------|-------|
| `primeiros-passos-infra-dogwalk.mdx` | "Vite 8" (prosa + tabelas) | 26, 35, 43, 248 |
| `inicio-dogwalk-marketplace-pets.mdx` | "Vite 8" | 91 |
| `primeiro-deploy-do-dogwalk-vite-cloudflare-pages.mdx` | "Vite 8" | 22 |
| `fastapi-react-por-que-escolhi-essa-stack-pro-dogwalk.mdx` | "VITE v6.2.0" (output) | 310 |

Nota: o post do portfólio (`portfolio-v3-vue-35-vite-8-o-rebuild-que-eu-precisava.mdx`) mostra `vite v8.0.0` no terminal — então Vite 8 de fato existe neste universo. O output `v6.2.0` no post do Dogwalk está defasado.

**Severidade:** 🟡 Leve — o output `v6.2.0` parece copiado de um terminal real sem atualizar para a versão 8.0.0 usada na narrativa.

---

## 4. 🚩 INCONSISTÊNCIA — Schema SQL: role no `users` vs `profiles`

**Arquivo:** `primeiros-passos-infra-dogwalk.mdx`  
**Problema:** Duas definições de schema incompatíveis no mesmo post.

**Migration inicial** (linhas 162-183):
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    ...
);
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('tutor', 'passeador')),
    ...
);
```
→ role está em `profiles`, `users` não tem role.

**Segundo SQL** (linhas 225-231):
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('tutor', 'passeador')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```
→ role está em `users` e não existe tabela `profiles`.

A linha 190 diz "a estrutura de `users + profiles` se manteve", mas o segundo SQL mostra apenas `users` com role embutido.

**Severidade:** 🔴 Médio — duas definições conflitantes da mesma estrutura, no mesmo post, podem causar confusão em quem está aprendendo com o post.

---

## 5. 🚩 INCONSISTÊNCIA — Tabelas de concorrentes diferentes

**Arquivos:**
- `dogwalk-a-primeira-ideia-do-marketplace-de-pets.mdx` (linhas 132-138)
- `inicio-dogwalk-marketplace-pets.mdx` (linhas 79-85)

**Problema:** Ambos os posts descrevem o "mapeamento de concorrentes" na fase de ideação, mas listam conjuntos completamente diferentes:

| Post 1 (primeira-ideia) | Post 2 (inicio-dogwalk) |
|---|---|
| DogHero | DogHero |
| PetLove | PetBacker |
| Guiavet | Cão Leve |
| Uber para pets (EUA) | Guru dos Pets |
| Grupos WhatsApp | — |

Apenas **DogHero** aparece em ambas as listas. O primeiro tem 5 concorrentes, o segundo tem 4. Os modelos de negócio e as métricas de comparação também são diferentes.

**Severidade:** 🟡 Leve — pode ser que sejam duas planilhas de concorrentes feitas em momentos diferentes, mas narrativamente soa como o mesmo "estudo de mercado".

---

## 6. ✅ URLs e Covers — OK

Todas as 7 capas referenciadas nos frontmatter existem em `public/covers/`:
- ✅ `dogwalk-a-primeira-ideia-do-marketplace-de-pets.webp`
- ✅ `dogwalk-primeiros-componentes-auth.webp`
- ✅ `dogwalk-amadurece-testes-playwright.webp`
- ✅ `inicio-dogwalk-marketplace-pets.webp`
- ✅ `fastapi-react-por-que-escolhi-essa-stack-pro-dogwalk.webp`
- ✅ `primeiros-passos-infra-dogwalk.webp`
- ✅ `primeiro-deploy-do-dogwalk-vite-cloudflare-pages.webp`

Nenhuma URL de domínio (`seu.pet`, `dogwalk.pages.dev`) parece quebrada — uso consistente em todos os posts.

---

## 7. ✅ Contas internas verificadas — OK

| Post | Conta | Resultado |
|------|-------|-----------|
| `auth` — Total de linhas (85+52+210+195+78+45) | 665 | ✅ |
| `auth` — Total de arquivos (2+1+3+3+1+2) | 12 | ✅ |
| `auth` — Total de testes (12+8+15+12+6+8) | 61 | ✅ |
| `testes` — Vitest + Playwright (342+511) | 853 | ✅ |
| `testes` — Soma E2E (42+38+55+67+73+41+29+23+143) | 511 | ✅ |
| `testes` — Stripe fee (85 × 2.9% + 0.49) | 2.955 ≈ 2.96 | ✅ (toBeCloseTo passa) |
| `primeira-ideia` — Comissão 12% de R$40 | R$4.80 | ✅ |
| `primeira-ideia` — Transações p/ R$10k (10000/4.80) | ~2.083 ≈ 2.100 | ✅ (rounding ok) |

---

## 8. ℹ️ Observação — Ilustração com bug de parâmetros

**Arquivo:** `inicio-dogwalk-marketplace-pets.mdx`, linhas 102-123

O código de busca de walkers usa placeholders numerados (`$1`, `$2`, `$3`, `$4`) condicionais. Se `city` for None mas `min_rating` for fornecido, a query teria `$2` sem `$1` — o que quebraria no asyncpg. É um exemplo didático e não quebra a leitura, mas vale documentar.

**Severidade:** 🟢 Mínima — código ilustrativo, não funcional.

---

## Resumo

| Tipo | Qtde | Severidade |
|------|------|-----------|
| 🔴 Erro numérico | 1 | Médio |
| 🔴 Inconsistência de schema | 1 | Médio |
| 🟡 Inconsistência de porta | 1 | Leve |
| 🟡 Inconsistência de versão | 1 | Leve |
| 🟡 Tabelas conflitantes | 1 | Leve |
| 🟢 Observação menor | 1 | Mínima |
| ✅ Verificações OK | 3+ | — |

**Total de issues:** 6 (1 erro numérico, 5 inconsistências)
**Nada quebrado (URLs/covers):** Nenhum
