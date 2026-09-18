# Decisões de arquitetura

## 1. Código independente
Este projeto não depende de banco, autenticação, nomes de funções, chaves de armazenamento ou arquivos do sistema usado como referência funcional. Requisitos e fluxos foram reimplementados com modelo próprio.

## 2. Segurança no banco
A aplicação cliente nunca possui privilégios administrativos. Autorização é aplicada no PostgreSQL/Supabase por Row Level Security (RLS), portanto esconder botões na interface não é considerado segurança.

## 3. Uma fonte de verdade
Equipamentos ficam em `equipment_catalog`. Áudio, Iluminação e Vídeo referenciam o mesmo cadastro para evitar divergência de peso/potência entre telas.

## 4. Projeto como núcleo
Todas as informações pertencem a um `project`. Estrutura, elétrica e documentos devem consolidar dados das áreas técnicas sempre que possível, reduzindo redigitação.

## 5. DEMO isolado
`npm run dev:demo` usa somente LocalStorage e dados marcados como DEMO. Produção usa Supabase. O modo demo nunca deve ser confundido com uma camada de segurança.
