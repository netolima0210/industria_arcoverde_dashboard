import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCampaign } from '@/app/dashboard/campanhas/actions';

export async function POST(req: Request) {
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: campaigns, error } = await supabase
        .from('campanhas')
        .select('id')
        .eq('status', 'agendada')
        .lte('scheduled_at', new Date().toISOString());

    if (error) {
        console.error('[cron/dispatch-campaign] Erro ao buscar campanhas agendadas:', error);
        return NextResponse.json({ error: 'Erro ao consultar banco de dados.' }, { status: 500 });
    }

    const ids = (campaigns || []).map(c => c.id);

    for (const id of ids) {
        after(async () => {
            try {
                await sendCampaign(id);
            } catch (err) {
                console.error('[cron/dispatch-campaign] Erro ao disparar campanha:', id, err);
            }
        });
    }

    return NextResponse.json({ dispatched: ids.length, ids });
}
