const express = require('express');
const app = express();
app.use(express.json());

// CORS - permite o mockup buscar dados daqui
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const VERIFY_TOKEN = 'gorum123';
let mensagens = [];

// Verificação do webhook Meta
app.get('/api/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recebe mensagens do WhatsApp
app.post('/api/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        change.value?.messages?.forEach(msg => {
          mensagens.push({
            de: msg.from,
            texto: msg.text?.body || '',
            hora: new Date(msg.timestamp * 1000).toLocaleString('pt-BR'),
            timestamp: Number(msg.timestamp),
            id: msg.id
          });
        });
      });
    });
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Lista plana de mensagens
app.get('/api/mensagens', (req, res) => {
  res.json(mensagens);
});

// Conversas agrupadas por número
app.get('/api/conversas', (req, res) => {
  const mapa = {};

  mensagens.forEach(msg => {
    if (!mapa[msg.de]) {
      mapa[msg.de] = {
        numero: msg.de,
        nome: msg.de,
        mensagens: [],
        ultimaMensagem: '',
        ultimaHora: '',
        ultimoTimestamp: 0,
        total: 0
      };
    }
    mapa[msg.de].mensagens.push({
      texto: msg.texto,
      hora: msg.hora,
      de: 'cliente'
    });
    if (msg.timestamp > mapa[msg.de].ultimoTimestamp) {
      mapa[msg.de].ultimaMensagem = msg.texto;
      mapa[msg.de].ultimaHora = msg.hora;
      mapa[msg.de].ultimoTimestamp = msg.timestamp;
    }
    mapa[msg.de].total++;
  });

  const lista = Object.values(mapa).sort(
    (a, b) => b.ultimoTimestamp - a.ultimoTimestamp
  );

  res.json(lista);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor Gorum rodando na porta', PORT));
