// Simple Express server to serve the Phoenix II demo
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve everything in this folder statically
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Phoenix II demo server running at http://localhost:${PORT}`);
});
