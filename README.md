# Meu Boda - Wedding & Event Planner

O **Meu Boda** é uma plataforma web moderna, elegante e robusta para planeamento, organização e gestão completa de casamentos e eventos (aniversários, noivados/pedidos, galas, etc.). A plataforma oferece ferramentas para controlo financeiro, gestão de convidados, organização de mesas (seating chart), envio de convites e controlo de entradas no evento via QR Code.

Esta aplicação foi desenvolvida com foco em alta performance, UX/UI premium (Rose Gold & Soft Off-White, animações fluidas) e uma forte localização para o mercado angolano (moeda Kwanza `Kz`, indicativo telefónico `+244` e integração intuitiva com GPS).

---

## Stack Tecnológica

### Frontend
- **Framework:** Next.js 16+ (App Router)
- **Biblioteca Base:** React 19 & TypeScript
- **Estilização:** Tailwind CSS v4 (Design System em CSS Vanilla para máxima performance)
- **Animações:** Framer Motion (Transições de página, contadores dinâmicos, e efeitos de hover)
- **Formulários e Validação:** React Hook Form & Zod
- **Gestão de Estado/Consultas:** TanStack Query (React Query)
- **Ícones:** Lucide React

### Backend & Infraestrutura
- **Serviços de Backend:** Supabase (Auth, Storage, Database e Realtime)
- **Base de Dados:** PostgreSQL 17 (com RLS - Row Level Security explícito)
- **Ambiente Local:** Docker & Docker Compose para emulação local do Supabase (Kong, PostgREST, Auth, Storage, Studio)

### Utilitários e Exportações
- **Geração de PDF:** jsPDF (com suporte a renderização de imagens e layouts de páginas múltiplas)
- **Geração de QR Code:** qrcode
- **Importação/Exportação de Dados:** XLSX (SheetJS)
- **Efeitos Visuais:** Canvas Confetti (para comemorações de RSVPs e Check-ins bem-sucedidos)

---

## Funcionalidades Implementadas

### 1. Painel de Controlo (Dashboard)
- **Métricas em Tempo Real:** Contagem regressiva de dias, total de convidados, confirmações de RSVP e tarefas pendentes com animações de contadores.
- **Gráficos Interativos:** Gráfico circular de estado de confirmações (RSVP) e gráfico de barras para controlo de orçamento orçado vs. pago por categorias em Kwanza (`Kz`).
- **Atalhos Rápidos:** Lista das próximas tarefas prioritárias e logs de check-ins recentes realizados na portaria.

### 2. Gestão de Convidados & Importação/Exportação
- **CRUD Completo:** Registo individual de convidados com informações de contacto, grupo familiar, acompanhantes autorizados, mesa reservada e notas de restrições alimentares.
- **Filtros Avançados:** Busca por texto livre (nome, e-mail, família) e filtragem rápida por estado de RSVP (Pendente, Confirmado, Recusado).
- **Importação/Exportação Excel:** Upload em lote de convidados a partir de planilhas Excel e download de relatórios completos no mesmo formato.

### 3. Sistema de Envio de Convites & Canais de Comunicação
- **Mensagens Personalizadas:** Geração dinâmica de convites em texto com emojis, detalhes do evento (data, hora, local da cerimónia e festa) e o link único de acesso ao portal RSVP do convidado.
- **Canais Integrados:**
  - **WhatsApp:** Sanitização e formatação automática de números de telemóvel angolanos (adiciona indicativo `244`) e abertura de chat com mensagem preenchida.
  - **SMS:** Disparo de mensagens SMS convencionais preenchidas através do protocolo `sms:`.
  - **E-mail:** Abertura do cliente de e-mail local pré-configurado com assunto e mensagem do convite.
- **Assistente de Envio em Massa (Wizard):** Fila de envio interativa que permite ao organizador enviar convites pendentes um a um consecutivamente com um único clique por convidado, contornando o bloqueio de pop-ups dos navegadores.

### 4. Organização de Mesas (Seating Arrangement)
- **Quadro Interativo de Mesas:** Definição de capacidade por mesa e visualização da ocupação atual.
- **Drag & Drop Nativo:** Arrastamento de convidados unseated (não alocados) diretamente para as mesas com atualização instantânea no banco de dados e contadores dinâmicos de capacidade máxima por mesa.

### 5. Configuração e Multi-tipo de Eventos
- **Suporte Geral de Eventos:** Suporta Casamentos (Weddings), Aniversários, Pedidos de Casamento/Noivados e Outros Eventos. O formulário de criação adapta-se dinamicamente às terminologias de cada tipo de celebração.
- **Campos Específicos para Casamento:** Registo de Igreja/Local da Cerimónia com hora de início, e Local da Festa/Copo d'Água com hora de início.
- **Suporte a Coordenadas GPS (Google Maps):** Campos dedicados para links do Google Maps, coordenadas geográficas ou endereços. O sistema resolve automaticamente as informações e cria um botão direto de navegação por GPS para o convidado.

### 6. Portal Público do Convidado (RSVP & Acesso)
- **Página de Boas-vindas Personalizada:** Apresentação da imagem de capa, contagem regressiva personalizada, e descrição do evento.
- **Formulário de Confirmação:** Confirmação de presença (Sim/Não), especificação exata de acompanhantes adicionais (dentro do limite configurado) e envio de restrições alimentares.
- **GPS "Como Chegar":** Botões intuitivos baseados em ícones que redirecionam o convidado diretamente para as direções do Google Maps para a cerimónia e para a festa.
- **Passe de Entrada com QR Code:** Geração de bilhete de acesso individual com QR Code legível no telemóvel para validação na portaria.
- **Download do Convite Completo (PDF de 2 Páginas):**
  - **Página 1:** Imagem do convite gráfico (importado diretamente do Canva pelo painel de administração).
  - **Página 2:** O passe de entrada oficial com os dados do evento, mesa atribuída e o QR Code.

### 7. Controlo de Portaria (Check-in)
- **Validação de Entrada:** Validação rápida de entradas através da leitura de QR Codes (simulado por introdução de token ou via câmara) contra a base de dados em tempo real.
- **Confetti Celebration:** Disparo de animação visual ao detetar entradas válidas e feedback sonoro/visual para controlo de acesso rápido.

### 8. Gestão Financeira, Tarefas, Contratos e Documentos
- **Orçamento por Categorias:** Categorização de despesas (Buffet, Salão, Dj, Flores, Lua de Mel...) com barras de progresso financeiro e balanço em Kwanza.
- **Gestão de Fornecedores:** Registo de contactos, links de sites e valores de contratos para controlo de pagamentos.
- **Lista de Tarefas:** Checklist interativo filtrado por prioridade (Alta, Média, Baixa) com prazos de conclusão.
- **Documentos:** Envio de contratos em PDF ou imagens dos fornecedores para pastas seguras de armazenamento (Supabase Storage) com pré-visualização.

---

## Estrutura do Projeto

A aplicação segue uma arquitetura limpa dividida por responsabilidades (Repository Pattern para persistência, Contexts para estado global e App Router para rotas):

```
src/
├── app/
│   ├── (auth)/                # Rotas de Login e Registo de utilizador
│   ├── (dashboard)/           # Rotas administrativas restritas
│   │   ├── admin/
│   │   │   ├── dashboard/     # Painel principal e métricas
│   │   │   ├── eventos/       # Edição dos detalhes do evento ativo
│   │   │   ├── convidados/    # CRUD de convidados e upload de Excel
│   │   │   ├── convites/      # Arte Canva, PDF e Envio individual/massa
│   │   │   ├── mesas/         # Organização de mesas via drag-and-drop
│   │   │   ├── tarefas/       # Checklist e cronograma do evento
│   │   │   ├── orcamento/     # Controlo financeiro por categoria
│   │   │   ├── fornecedores/  # Ficheiro de fornecedores e contratos
│   │   │   ├── documentos/    # Upload de contratos de fornecedores
│   │   │   ├── relatorios/    # Download de PDFs técnicos e Excel
│   │   │   └── checkin/       # Portaria e validação de QR Code
│   │   └── layout.tsx         # Sidebar e gestor de eventos ativos
│   ├── convite/[token]/       # Portal público do convidado (RSVP e QR Code)
│   ├── layout.tsx             # Providers globais (Auth, Event, TanStack Query)
│   └── page.tsx               # Redirecionador automático base de login/sessão
├── components/
│   ├── ui/                    # Componentes modulares e reutilizáveis (Card, Button, Dialog, Input)
│   ├── animations/            # Wrappers de animação com Framer Motion
│   └── layout/                # Cabeçalhos e componentes globais
├── contexts/                  # Contextos globais (AuthContext, EventContext)
├── repositories/              # Interação direta com a API do Supabase (Repository Pattern)
├── services/                  # Lógica de negócio integrada (Dashboard aggregation)
├── types/                     # Interfaces TypeScript (Event, Guest, Budget, Vendor, etc.)
├── utils/                     # Utilitários de Excel, PDF de 2 páginas e QR Code
└── validations/               # Validações estruturadas com Zod
```

---

## Instalação e Configuração Local

### Requisitos Pró-ativos
1. [Node.js](https://nodejs.org/) (versão 18 ou superior)
2. [Docker Desktop](https://www.docker.com/products/docker-desktop/) (necessário para correr a base de dados localmente)

### Passos para Inicialização

1. **Clonar o Repositório e Instalar Dependências:**
   ```bash
   npm install
   ```

2. **Iniciar a Base de Dados e Serviços Supabase:**
   Certifique-se de que o Docker está a correr no seu computador e execute:
   ```bash
   docker-compose up -d
   ```
   *Os serviços locais do Supabase serão iniciados nas seguintes portas configuradas:*
   - **Kong (API Gateway):** `http://127.0.0.1:64321` (URL base da API local)
   - **PostgreSQL Database:** `64322`
   - **Supabase Studio (Dashboard Web):** `http://127.0.0.1:64323` (Utilize para inspecionar tabelas, auth logs e buckets de forma simples)
   - **Inbucket (Serviço de Mailpit):** `http://127.0.0.1:64324` (Apanha todos os e-mails enviados localmente pelo Supabase Auth)

3. **Configurar as Variáveis de Ambiente:**
   Crie ou verifique o arquivo `.env.local` na raiz do projeto:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:64321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
   ```

4. **Executar o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador para aceder à plataforma.

---

## Sugestões para Próximos Passos (Roadmap de Evolução)

Para transformar esta aplicação num produto comercial escalável e altamente lucrativo, sugerimos os seguintes desenvolvimentos de negócio e tecnologia:

### 1. Automação Nativa de Mensagens (WhatsApp Cloud API)
* **Como funciona:** Substituição do redirecionamento `wa.me` manual (onde o organizador precisa de enviar as mensagens uma a uma no seu próprio telemóvel) por uma integração direta com a **API oficial do WhatsApp** (ou gateways parceiros como Z-API, Evolution API).
* **Valor estratégico:** Envio automático de lembretes e recolha de confirmações (RSVP) em lote, cobrando aos utilizadores um valor por mensagem ou pacote de disparos (SaaS Pay-as-you-go).

### 2. Integração com Gateways de Pagamento em Angola (Lista de Presentes Fictícia)
* **Como funciona:** Desenvolvimento do módulo de "Lista de Casamento / Presentes em Dinheiro". Integração com intermediários de pagamento nacionais como **Multicaixa Express**, **Unitel Money** ou gateways autorizados **EMIS** para permitir contribuições diretas dos convidados.
* **Valor estratégico:** A plataforma retém uma taxa administrativa (ex: 2.5% a 3%) sobre cada transação financeira recebida em nome do casal.

### 3. White-Label / Multi-Tenant para Agências de Eventos
* **Como funciona:** Customização avançada da plataforma que permite a empresas de protocolo e organização utilizarem o sistema nos seus próprios domínios personalizados (ex: `casamentos.nomedaagencia.ao`) e com as suas cores institucionais.
* **Valor estratégico:** Modelo de subscrição recorrente (SaaS B2B) com planos corporativos de alto valor anual.

### 4. Aplicação Mobile Nativa para Portaria (Check-in por Câmara)
* **Como funciona:** Construção de um aplicativo móvel híbrido leve (ou Progressive Web App - PWA) com acesso nativo à câmara traseira do telemóvel. A equipa de protocolo poderá apenas apontar a câmara para o QR Code do convidado para registar a entrada em segundos.
* **Valor estratégico:** Redução de filas, controlo de segurança no local físico e maior profissionalismo para a empresa de protocolo contratada.

### 5. Catálogo / Marketplace de Fornecedores Locais
* **Como funciona:** Lançamento de um portal público integrado onde noivos possam consultar fornecedores parceiros de casamentos (espaço, buffet, som, vestidos, fotografia) com avaliações reais de ex-clientes.
* **Valor estratégico:** Cobrança de planos mensais de publicidade e destaque aos fornecedores parceiros na sua região geográfica.
