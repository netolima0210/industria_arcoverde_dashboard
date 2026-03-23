const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('C:\\\\Users\\\\netol\\\\Downloads\\\\Clientes.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];

const data = XLSX.utils.sheet_to_json(ws);

let sql = `ALTER TABLE clientes \nADD COLUMN IF NOT EXISTS cidade text,\nADD COLUMN IF NOT EXISTS regiao text,\nADD COLUMN IF NOT EXISTS estado text;\n\n`;
let count = 0;

let clients = [];
let currentClient = null;

data.forEach(row => {
    if (row['__EMPTY_7']) {
        if (currentClient) clients.push(currentClient);
        currentClient = {
            nome: row['Clientes'] ? row['Clientes'].toString().trim() : '',
            fone: row['__EMPTY_4'] ? row['__EMPTY_4'].toString().trim() : '',
            cidade: (row['__EMPTY_5'] ? row['__EMPTY_5'].toString().trim() : '') + (row['__EMPTY_6'] && row['__EMPTY_6'] !== 'Estado' ? ' ' + row['__EMPTY_6'].toString().trim() : ''),
            estado: row['__EMPTY_7'].toString().trim()
        };
    } else if (currentClient) {
        currentClient.nome += (row['Clientes'] ? ' ' + row['Clientes'].toString().trim() : '');
        currentClient.fone += (row['__EMPTY_4'] ? row['__EMPTY_4'].toString().trim() : '');
        currentClient.cidade += ' ' + (row['__EMPTY_5'] ? row['__EMPTY_5'].toString().trim() : '') + (row['__EMPTY_6'] && row['__EMPTY_6'] !== 'Estado' ? ' ' + row['__EMPTY_6'].toString().trim() : '');
    }
});
if (currentClient) clients.push(currentClient);

clients.forEach(c => {
    if (c.cidade && c.cidade !== 'Cidade') {
        let nome = c.nome.replace(/'/g, "''");
        let fone = c.fone.replace(/\D/g, '');
        let cidade = c.cidade.trim().replace(/\s{2,}/g, ' ');
        let estado = c.estado;

        let map = {
            'AFOGADOS DA INGAZEIRA': 'Afogados da Ingazeira', 
            'VITORIA DE SANTO ANTAO': 'Vitória de Santo Antão',
            'SÃO JOÃO': 'São João',
            'SAO FELIX': 'São Félix',
            'BEZERROS': 'Bezerros',
            'CABO DE SANTO AGOSTINHO': 'Cabo de Santo Agostinho',
            'CAMOCIM DE SAO FELIX': 'Camocim de São Félix',
            'SÃO BENEDITO DO SUL': 'São Benedito do Sul',
            'SAO JOSE DO EGITO': 'São José do Egito',
            'SÃO JOSÉ DO EGITO': 'São José do Egito',
            'SANTA CRUZ DA BAIXA VERDE': 'Santa Cruz da Baixa Verde',
            'PALMEIRA DOS INDIOS': 'Palmeira dos Índios',
            'JABOATAO DOS GUARARAPES': 'Jaboatão dos Guararapes',
            'JABOATÃO DOS GUARARAPES': 'Jaboatão dos Guararapes',
            'BELÉM DO SÃO FRANCISCO': 'Belém do São Francisco',
            'UNIAO DOS PALMARES': 'União dos Palmares',
            'SANTA MARIA DA BOA VISTA': 'Santa Maria da Boa Vista',
            'DELMIRO GOUVEIA': 'Delmiro Gouveia'
        };
        
        let upper = cidade.toUpperCase();
        cidade = map[upper] || upper.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        cidade = cidade.replace(/'/g, "''");
        
        const foneFmt = fone.length > 5 ? fone.substring(fone.length - 8) : fone;
        if (foneFmt && foneFmt.length >= 4) {
            sql += `UPDATE clientes SET cidade = '${cidade}', estado = '${estado}' WHERE contato LIKE '%${foneFmt}%' OR nome ILIKE '${nome}%';\n`;
            count++;
        }
    }
});

fs.writeFileSync('C:\\\\Users\\\\netol\\\\OneDrive\\\\Desktop\\\\Projetos\\\\Ind arcoverde dashboard\\\\dashboard\\\\update_cidades.sql', sql);
console.log('Gerou ' + count + ' updates!');
