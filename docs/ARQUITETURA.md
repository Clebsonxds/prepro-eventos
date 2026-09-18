# Decisões de arquitetura — Alpha 0.2

## 1. Implementação independente
O projeto não utiliza banco, autenticação, chaves, nomes de funções ou estrutura de arquivos do sistema legado. O legado serve somente como referência de requisitos e para uma semente de catálogo marcada como não homologada.

## 2. Projeto como núcleo
`projects` define a janela operacional desde o início da montagem até a liberação pós-desmontagem. Reservas de estoque usam esta janela, não apenas a data do evento.

## 3. Estrutura física é compartilhada
Som e Luz não possuem traves independentes. `project_groups` com `area='structure'` representa a estrutura real (ex.: Trave Principal Q30 12m). Itens de Áudio, Iluminação e Vídeo apontam para a mesma estrutura via `group_id`, permitindo uma única soma de carga.

## 4. Catálogo ≠ Inventário
`equipment_catalog` guarda a identidade e especificações do produto. `stock_total` e `maintenance_qty` iniciam o controle agregado de disponibilidade. A disponibilidade temporal é derivada dos `project_items` em projetos que se sobrepõem.

## 5. Dados legados são semente
A lista anterior é importada como `verification_status='pending'` e `stock_total=0`. Gerência precisa revisar ficha técnica/inventário e homologar cada produto antes de tratá-lo como fonte técnica.

## 6. Segurança em camadas
- Supabase Auth autentica.
- `profiles.approval_status` bloqueia contas novas até aprovação.
- RLS/SQL aplicam autorização no banco.
- UI esconde/desabilita ações conforme o papel, mas isso não é a barreira de segurança principal.
- acesso a código é um assunto do GitHub, separado do papel `admin` no app.

## 7. Papéis
- `viewer`: leitura.
- `producer`: edição operacional de projetos autorizados.
- `management`: projetos + usuários operacionais + catálogo/inventário/manutenção + exceções de estoque.
- `admin`: administração do produto e promoção para funções privilegiadas.

## 8. Estoque por período
Disponibilidade = estoque total − manutenção − reservas em projetos sobrepostos + exceções aprovadas. Uma exceção de estoque exige Gerência/Admin e justificativa em `reservation_overrides`.

## 9. Vídeo é dimensional
O produtor informa a medida desejada e escolhe o painel do catálogo. A aplicação deriva quantidade de módulos, medida efetiva, pixels, portas de rede, alimentações, jumps, cases e apoios conforme o modo de montagem. Painel suspenso precisa ser associado a uma estrutura compartilhada.

## 10. Uma fonte de verdade para documentos
Dossiê, Memorial Aéreo e Memorial de Solo são saídas do mesmo projeto. Não existe redigitação manual entre calculadoras e documento final.

## 11. Memoriais são pré-produção até homologação
Margens, kg/ponto, kg/m² e regras derivadas são ferramentas de pré-produção. A emissão legal depende de revisão e aprovação do profissional habilitado.
