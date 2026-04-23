const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'gorum123';
let mensagens = [];

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

app.post('/api/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        change.value?.messages?.forEach(msg => {
          mensagens.push({
            de: msg.from,
            texto: msg.text?.body,
            hora: new Date(msg.timestamp * 1000).toLocaleString('pt-BR'),
          });
        });
      });
    });
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get('/api/mensagens', (req, res) => {
  res.json(mensagens);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor Gorum rodando na porta', PORT));
