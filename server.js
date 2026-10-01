const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3082;
const DB_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Bloqueia acesso direto ao arquivo de dados antes de servir os estáticos
app.get('/data.json', (req, res) => res.status(403).end());

app.use(express.static(__dirname));

// Inicializar banco de dados
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const init = { registros: [], colaboradores: [], mesFechamento: '', pagamentos: [], legado: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(init));
    return init;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data));
}

// GET - carregar todos os dados
app.get('/api/dados', (req, res) => {
  res.json(loadDB());
});

// POST - salvar todos os dados
// Trava de seguranca: recusa gravacoes que reduziriam drasticamente
// registros, pagamentos ou legado (ex: uma aba desatualizada tentando
// salvar por cima com dados vazios/antigos).
app.post('/api/dados', (req, res) => {
  const atual = loadDB();
  const novo = req.body || {};
  const chaves = ['registros', 'pagamentos', 'legado'];
  for (const k of chaves) {
    const antigo = (atual[k] || []).length;
    const novoLen = (novo[k] || []).length;
    if (antigo >= 10 && novoLen < antigo * 0.5) {
      console.error('BLOQUEADO: tentativa de salvar ' + k + ' caindo de ' + antigo + ' para ' + novoLen);
      return res.status(409).json({
        ok: false,
        erro: 'Gravacao bloqueada: ' + k + ' cairia de ' + antigo + ' para ' + novoLen + ' registros. Recarregue a pagina e tente novamente.'
      });
    }
  }
  saveDB(novo);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
