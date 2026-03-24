const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Configurações Evolution API (BASEADAS NO TESTE DE SUCESSO)
const EVOLUTION_URL = 'https://evolution.app.info.pl';
const EVOLUTION_API_KEY = '9194DE34E9DC-4567-9701-C6C631318627';
const INSTANCE_NAME = 'Max_vendedor1';
const ENDPOINT = '/chat/whatsappNumbers';

// Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyNumbers() {
    console.log('--- Iniciando Faxina de WhatsApp (Deleção de Inválidos) ---');
    
    let hasMore = true;
    let totalProcessed = 0;
    let totalDeleted = 0;

    while (hasMore) {
        // Buscar leads que ainda não têm is_whatsapp definido como true (ou false, mas aqui usamos a coluna p/ controle)
        // Se a coluna não existir, o script vai falhar, então o usuário precisa rodar o SQL.
        const { data: leads, error } = await supabase
            .from('clientes')
            .select('id, contato')
            .eq('is_whatsapp', false) // Processar os que ainda estão como false (default)
            .limit(50); 

        if (error) {
            console.error('Erro ao buscar leads:', error);
            console.log('DICA: Você já rodou o comando SQL no Supabase?');
            return;
        }

        if (!leads || leads.length === 0) {
            hasMore = false;
            console.log('Busca finalizada: Todos os leads restantes já foram verificados.');
            break;
        }

        console.log(`--- Bloco: verificando ${leads.length} leads ---`);

        for (const lead of leads) {
            totalProcessed++;
            try {
                let number = lead.contato.replace(/\D/g, '');
                if (number.length === 0) {
                    // Se não tem número, deletar também
                    console.log(`🗑️ Excluindo lead ${lead.id} - Número vazio`);
                    await supabase.from('clientes').delete().eq('id', lead.id);
                    totalDeleted++;
                    continue;
                }

                if (number.length <= 11) number = '55' + number;

                const response = await axios.post(`${EVOLUTION_URL}${ENDPOINT}/${INSTANCE_NAME}`, {
                    numbers: [number]
                }, {
                    headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' }
                });

                const result = response.data[0];
                const isWhatsapp = result && result.exists;

                if (isWhatsapp) {
                    process.stdout.write('✅'); 
                    await supabase.from('clientes').update({ is_whatsapp: true }).eq('id', lead.id);
                } else {
                    process.stdout.write('🗑️');
                    await supabase.from('clientes').delete().eq('id', lead.id);
                    totalDeleted++;
                }
            } catch (err) {
                console.error(`\nErro no número ${lead.contato}:`, err.message);
            }
        }
        console.log(`\nProgresso: ${totalProcessed} processados, ${totalDeleted} excluídos.`);
        // Pequena pausa para evitar rate limit
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n--- Faxina Concluída! ---`);
    console.log(`Total Processados: ${totalProcessed}`);
    console.log(`Total Excluídos: ${totalDeleted}`);
}

verifyNumbers();
