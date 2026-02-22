
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            clientes: {
                Row: {
                    id: string
                    nome: string
                    contato: string | null
                    cpf_cnpj: string | null
                    status: string | null
                    email: string | null
                    rua: string | null
                    numero: string | null
                    bairro: string | null
                    cidade: string | null
                    estado: string | null
                    cep: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    nome: string
                    contato?: string | null
                    cpf_cnpj?: string | null
                    status?: string | null
                    email?: string | null
                    rua?: string | null
                    numero?: string | null
                    bairro?: string | null
                    cidade?: string | null
                    estado?: string | null
                    cep?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    contato?: string | null
                    cpf_cnpj?: string | null
                    status?: string | null
                    email?: string | null
                    rua?: string | null
                    numero?: string | null
                    bairro?: string | null
                    cidade?: string | null
                    estado?: string | null
                    cep?: string | null
                    created_at?: string
                }
            }
            conversas: {
                Row: {
                    id: string
                    cliente_id: string | null
                    data_inicio: string
                    data_fim: string | null
                    status: string | null
                    setor_transferido: string | null
                    duracao_segundos: number | null
                    qtd_mensagens: number | null
                    sentimento: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    cliente_id?: string | null
                    data_inicio?: string
                    data_fim?: string | null
                    status?: string | null
                    setor_transferido?: string | null
                    duracao_segundos?: number | null
                    qtd_mensagens?: number | null
                    sentimento?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    cliente_id?: string | null
                    data_inicio?: string
                    data_fim?: string | null
                    status?: string | null
                    setor_transferido?: string | null
                    duracao_segundos?: number | null
                    qtd_mensagens?: number | null
                    sentimento?: string | null
                    created_at?: string
                }
            },
            n8n_chat_conversas: {
                Row: {
                    id: number
                    session_id: string
                    message: Json
                    created_at: string
                }
                Insert: {
                    id?: number
                    session_id: string
                    message: Json
                    created_at?: string
                }
                Update: {
                    id?: number
                    session_id?: string
                    message?: Json
                    created_at?: string
                }
            },
            produtos: {
                Row: {
                    id: string
                    codigo: string | null
                    nome: string
                    linha: string | null
                    categoria: string | null
                    apresentacao: string | null
                    embalagem: string | null
                    ativo: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    codigo?: string | null
                    nome: string
                    linha?: string | null
                    categoria?: string | null
                    apresentacao?: string | null
                    embalagem?: string | null
                    ativo?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    codigo?: string | null
                    nome?: string
                    linha?: string | null
                    categoria?: string | null
                    apresentacao?: string | null
                    embalagem?: string | null
                    ativo?: boolean
                    created_at?: string
                }
            },
            vendedores: {
                Row: {
                    id: string
                    nome: string
                    telefone: string | null
                    email: string | null
                    endereco: string | null
                    regiao_atende: string | null
                    cidades_atende: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    nome: string
                    telefone?: string | null
                    email?: string | null
                    endereco?: string | null
                    regiao_atende?: string | null
                    cidades_atende?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    telefone?: string | null
                    email?: string | null
                    endereco?: string | null
                    regiao_atende?: string | null
                    cidades_atende?: string | null
                    created_at?: string
                }
            },
            campanhas: {
                Row: {
                    id: string
                    nome: string
                    mensagem: string
                    imagem_url: string | null
                    publico_alvo: string
                    status: string
                    total_alvos: number
                    enviados: number
                    erros: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    nome: string
                    mensagem: string
                    imagem_url?: string | null
                    publico_alvo: string
                    status?: string
                    total_alvos?: number
                    enviados?: number
                    erros?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    mensagem?: string
                    imagem_url?: string | null
                    publico_alvo?: string
                    status?: string
                    total_alvos?: number
                    enviados?: number
                    erros?: number
                    created_at?: string
                }
            },
            campanhas_envios: {
                Row: {
                    id: string
                    campanha_id: string
                    lead_id: string | null
                    vendedor_id: string | null
                    status: string
                    mensagem_erro: string | null
                    enviado_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    campanha_id: string
                    lead_id?: string | null
                    vendedor_id?: string | null
                    status?: string
                    mensagem_erro?: string | null
                    enviado_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    campanha_id?: string
                    lead_id?: string | null
                    vendedor_id?: string | null
                    status?: string
                    mensagem_erro?: string | null
                    enviado_at?: string | null
                    created_at?: string
                }
            }
            // Add other tables as needed for MVP
        }
    }
}
