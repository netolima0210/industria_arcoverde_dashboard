-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: clientes (Correspondente aos Leads e Clientes do n8n)
create table if not exists clientes (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  contato text, -- WhatsApp/Telefone
  cpf_cnpj text,
  status text default 'novo', -- Status do funil
  email text,
  rua text,
  numero text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index para busca rápida por contato (usado pelo n8n)
create index if not exists clients_contato_idx on clientes (contato);

-- Table: conversas (Metadados das conversas para o Dashboard)
create table if not exists conversas (
  id uuid default uuid_generate_v4() primary key,
  cliente_id uuid references clientes(id),
  data_inicio timestamp with time zone default timezone('utc'::text, now()) not null,
  data_fim timestamp with time zone,
  status text, -- ex: 'aberta', 'fechada'
  setor_transferido text,
  duracao_segundos integer,
  qtd_mensagens integer,
  sentimento text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- NOTA: A tabela n8n_chat_conversas NÃO deve ser criada manualmente.
-- Ela é criada e gerenciada automaticamente pelo node "Postgres Chat Memory" do n8n.
