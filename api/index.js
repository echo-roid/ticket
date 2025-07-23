const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const cors = require('cors');

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload', upload.array('files'), (req, res) => {
  const folderName = req.body.folderName;
  if (!folderName) return res.status(400).json({ message: 'Folder name is missing' });

  const basePath = path.join(__dirname, '..', 'data', folderName);
  fs.mkdirSync(basePath, { recursive: true });

  req.files.forEach(file => {
    const filePath = path.join(basePath, file.originalname);
    fs.writeFileSync(filePath, file.buffer);
  });

  res.json({ message: `Folder "${folderName}" uploaded successfully.` });
});

app.get('/image/:id', (req, res) => {
  const idFolder = path.join(__dirname, '..', 'data', req.params.id);
  if (fs.existsSync(idFolder)) {
    const files = fs.readdirSync(idFolder).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
    if (files.length) {
      return res.json({ imageUrl: `/data/${req.params.id}/${files[0]}` });
    }
  }
  res.status(404).json({ message: 'ID not found or image missing.' });
});

// Export for Vercel
module.exports = app;
