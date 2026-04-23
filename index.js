const express = require('express');
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const VERIFY_TOKEN = 'gorum123';
let mensagens = [];

app.get('/api/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else { res.sendStatus(403); }
});

app.post('/api/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        change.value?.messages?.forEach(msg => {
          mensagens.push({
            de: msg.from, texto: msg.text?.body || '',
            hora: new Date(msg.timestamp * 1000).toLocaleString('pt-BR'),
            timestamp: Number(msg.timestamp), id: msg.id
          });
        });
      });
    });
    res.sendStatus(200);
  } else { res.sendStatus(404); }
});

app.get('/api/mensagens', (req, res) => { res.json(mensagens); });

app.get('/api/conversas', (req, res) => {
  const mapa = {};
  mensagens.forEach(msg => {
    if (!mapa[msg.de]) {
      mapa[msg.de] = { numero: msg.de, nome: msg.de, mensagens: [],
        ultimaMensagem: '', ultimaHora: '', ultimoTimestamp: 0, total: 0 };
    }
    mapa[msg.de].mensagens.push({ texto: msg.texto, hora: msg.hora, de: 'cliente' });
    if (msg.timestamp > mapa[msg.de].ultimoTimestamp) {
      mapa[msg.de].ultimaMensagem = msg.texto;
      mapa[msg.de].ultimaHora = msg.hora;
      mapa[msg.de].ultimoTimestamp = msg.timestamp;
    }
    mapa[msg.de].total++;
  });
  const lista = Object.values(mapa).sort((a, b) => b.ultimoTimestamp - a.ultimoTimestamp);
  res.json(lista);
});

app.post('/api/enviar', async (req, res) => {
  const { para, texto } = req.body;
  if (!para || !texto) return res.status(400).json({ error: 'para e texto são obrigatórios' });

  try {
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${process.env.PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: para,
          type: 'text',
          text: { body: texto }
        })
      }
    );
    const data = await response.json();
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor Gorum rodando na porta', PORT));
