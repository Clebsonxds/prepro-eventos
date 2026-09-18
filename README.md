# PrePro Eventos — Alpha 0.2

Implementação independente para pré-produção técnica de eventos. O projeto foi iniciado do zero e não depende do banco, autenticação, nomenclaturas internas ou código do sistema usado apenas como referência funcional.

## O que esta Alpha já cobre

- autenticação via Supabase Auth em produção e modo DEMO isolado;
- perfis `viewer`, `producer`, `management` e `admin`;
- cadastro novo nasce `pending` e precisa de aprovação;
- senha validada na interface com 8+ caracteres, maiúscula, minúscula e caractere especial;
- projetos com montagem, evento e **fim da desmontagem/liberação dos equipamentos**;
- validação cronológica das cinco datas/horários;
- Áudio simplificado: mesa, equipamentos, posição, peso e consumo;
- estruturas físicas compartilhadas por Som, Luz e Vídeo;
- treliças Q15/Q20/Q25/Q30/Q50/outra, comprimento, origem, pontos, capacidade e talhas;
- múltiplos painéis de LED com cálculo de placas, resolução, portas de rede, alimentações, jumps, cases e apoios;
- catálogo técnico central com marca, modelo, peso, consumo, estoque e manutenção;
- base antiga importada apenas como **semente PENDENTE**, nunca como dado homologado;
- disponibilidade de estoque por sobreposição de datas;
- bloqueio de reserva quando falta estoque controlado;
- exceção de estoque para Gerência/Admin mediante justificativa e registro;
- presença em tempo real em produção: quem está online, projeto e rota atual;
- auditoria de alterações e indicação da última alteração no projeto;
- estimativa elétrica consolidada;
- Dossiê técnico imprimível;
- Memorial Aéreo e Memorial de Solo em CSV para abrir no Excel;
- schema Supabase com RLS e políticas por função;
- workflow de GitHub Pages para o DEMO.

> **Atenção técnica:** pesos lineares, fatores de segurança, regras de mãos francesas, limites de processamento e demais valores herdados como referência precisam ser homologados contra inventário/ficha técnica e revisados pelo profissional habilitado antes de uso como documentação legal.

## Modelo operacional

### Visualizador
Somente leitura dos projetos aos quais possui acesso.

### Produtor
Cria e edita projetos autorizados, sem administrar catálogo/usuários.

### Gerência
Pode operar projetos, aprovar Visualizadores/Produtores, administrar catálogo, estoque, manutenção e autorizar exceções de estoque com justificativa.

### Admin
Tudo da Gerência e permissões administrativas do sistema. **Acesso ao código-fonte não é concedido por este papel**; quem pode alterar código é definido separadamente no GitHub.

## Testar no computador

1. Instale Node.js 22 ou superior.
2. Abra um terminal dentro desta pasta.
3. Execute:

```bash
npm install
npm run dev:demo
```

4. Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

O modo DEMO salva dados no navegador e entra como Admin de demonstração. Ele é apenas para UX/desenvolvimento.

## Produção segura com Supabase

1. Crie um projeto **novo e exclusivo** no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Importe `supabase/seed-legacy.sql` somente se quiser usar a base antiga como lista inicial não homologada.
4. Em Authentication, mantenha cadastro por e-mail disponível para que o usuário possa solicitar acesso, habilite confirmação de e-mail e configure a política de senha mais restritiva disponível. Não habilite acesso anônimo.
5. Crie sua primeira conta pelo formulário e, pelo SQL Editor, promova apenas o primeiro administrador conforme a instrução ao fim de `schema.sql`.
6. Copie `.env.example` para `.env` e preencha:

```env
VITE_APP_NAME="PrePro Eventos"
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_PUBLICA"
VITE_DEMO_MODE="false"
```

7. Rode `npm run dev`.

### Segurança

- `service_role` **nunca** vai para frontend, GitHub ou variável Vite.
- esconder botão não é segurança: permissões críticas também são aplicadas por RLS/trigger no banco;
- contas novas ficam `pending` e não recebem acesso operacional até aprovação;
- Gerência não pode promover outra pessoa a Gerência/Admin;
- exceções de estoque exigem papel de Gerência/Admin e justificativa;
- para produção, recomenda-se MFA obrigatório para Gerência/Admin antes do lançamento definitivo.

## GitHub Pages — DEMO

O arquivo `.github/workflows/deploy-pages.yml` publica automaticamente o modo DEMO ao fazer push na `main`.

No GitHub:

1. `Settings > Pages > Source` → **GitHub Actions**.
2. Faça o push da atualização.
3. Acompanhe em `Actions > Deploy GitHub Pages`.

O workflow atual define `VITE_DEMO_MODE=true` deliberadamente. Antes de produção com usuários reais, troque o workflow para usar o Supabase e secrets do repositório.

## Estrutura do projeto

```text
src/
  components/       interface compartilhada
  contexts/         autenticação, dados e presença
  data/             persistência DEMO/Supabase + semente
  pages/            telas do produto
  types/            modelo de domínio
  utils/            cálculos, datas, senha e exportação
supabase/
  schema.sql         banco, RLS, estoque, auditoria e autorização
  seed-legacy.sql    base antiga importada como PENDENTE / estoque 0
.github/workflows/
  deploy-pages.yml   publicação automática do DEMO
```

## Próximas etapas

1. homologar o inventário real da empresa e remover itens irrelevantes da semente;
2. criar interface de membros/permissão por projeto;
3. transformar manutenção agregada em histórico por unidade/serial quando necessário;
4. revisar com engenharia as regras dos memoriais e fatores de segurança;
5. evoluir o Dossiê para cronograma, equipe, renders, logística e QR codes;
6. gerar XLSX/PDF profissionais em vez de CSV/impressão do navegador;
7. MFA para funções privilegiadas e revisão de segurança antes de sair do piloto.
