// server.js
// Ce serveur est utile uniquement en local.
// Sur Netlify, les fichiers statiques seront servis automatiquement depuis "public/".

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Dossier "public" pour Netlify + local
app.use(express.static(path.join(__dirname, 'public')));

// Redirige toujours vers index.html (utile si un jour tu ajoutes du routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Phoenix II demo running locally at http://localhost:${PORT}`);
});
