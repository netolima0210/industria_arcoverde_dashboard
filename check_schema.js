const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uvjdxecyulzpitrgzhnt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2amR4ZWN5dWx6cGl0cmd6aG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODQzMzksImV4cCI6MjA4MDQ2MDMzOX0.kmwINhPcfe74VRkejQm-2um74mJRdQAn_x9UpQMSNPs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('--- COLUMNS FOUND ---');
        Object.keys(data[0]).forEach(key => {
            console.log(key + ': ' + (typeof data[0][key]));
        });
        console.log('--- DATA SAMPLE ---');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data found in produtos table.');
    }
}

checkSchema();
