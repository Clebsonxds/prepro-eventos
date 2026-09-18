# Projeto Técnico de Eventos — Alpha 0.1

Nova implementação independente para pré-produção técnica de eventos. O código foi iniciado do zero com uma arquitetura própria, separando interface, regras de negócio, catálogo, projetos e autenticação.

## O que já existe

- login por Supabase Auth;
- modo DEMO local separado do modo de produção;
- papéis `admin`, `producer` e `viewer`;
- projetos com local, endereço, salas, responsáveis e períodos completos;
- validação cronológica de montagem e evento;
- catálogo técnico central;
- grupos de Áudio e Iluminação com classificação aéreo/solo;
- múltiplos sistemas de LED;
- consolidação de cargas;
- estimativa elétrica de pré-produção;
- prévia de Dossiê com identidade azul-marinho/hexagonal;
- schema Supabase com RLS para impedir acesso indevido aos projetos;
- workflow pronto para GitHub Pages.

> Os equipamentos incluídos no modo DEMO são apenas exemplos de interface. Não devem ser usados como referência técnica até serem substituídos por um catálogo homologado.

## Testar agora no computador

1. Instale Node.js 22 ou superior.
2. Abra um terminal dentro desta pasta.
3. Execute:

```bash
npm install
npm run dev:demo
```

4. Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

O modo DEMO não exige login real e salva dados no navegador. Ele existe apenas para desenvolvimento e testes.

## Produção segura com Supabase

1. Crie um projeto **novo** no Supabase.
2. Abra **SQL Editor** e execute `supabase/schema.sql`.
3. Em Authentication, desabilite cadastro público se o sistema for interno.
4. Crie/convide os usuários autorizados.
5. Promova somente o primeiro administrador pelo SQL Editor conforme a instrução no final do `schema.sql`.
6. Copie `.env.example` para `.env` e preencha:

```env
VITE_APP_NAME="Projeto Técnico de Eventos"
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_PUBLICA"
VITE_DEMO_MODE="false"
```

7. Rode `npm run dev`.

### Segurança importante

A chave `anon` do Supabase é pública por natureza e pode ficar no frontend. A segurança dos dados vem das políticas **RLS** incluídas no schema. **Nunca** coloque `service_role` no frontend, no GitHub ou em variáveis Vite.

## Subir no GitHub Pages

Depois de criar o repositório:

```bash
git init
git add .
git commit -m "Alpha inicial"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

No GitHub:

1. `Settings > Pages > Source`: escolha **GitHub Actions**.
2. Em `Settings > Secrets and variables > Actions > Secrets`, crie:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Em `Variables`, crie `VITE_APP_NAME` se quiser mudar o nome.
4. Para um deploy **temporário de demonstração sem autenticação**, crie a variável `VITE_DEMO_MODE=true`. Remova-a/defina `false` assim que o Supabase estiver configurado.
5. Faça um novo push ou rode o workflow manualmente em `Actions`.

## Estrutura

```text
src/
  components/       interface compartilhada
  contexts/         autenticação e estado da aplicação
  data/             camada de persistência (demo e Supabase)
  pages/            telas do produto
  types/            modelo de domínio
  utils/            cálculos e validações
supabase/
  schema.sql         tabelas, funções e RLS
.github/workflows/
  deploy-pages.yml   publicação automática
```

## Próximas etapas recomendadas

1. homologar o catálogo técnico real;
2. adicionar membros aos projetos pela interface;
3. histórico/auditoria de alterações;
4. memoriais aéreo e solo com regras revisadas pelo engenheiro;
5. geração do Dossiê final com cronograma, equipe, imagens e logística;
6. versionamento de projetos e aprovação técnica.
