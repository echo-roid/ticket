const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static('public'));
app.use('/data', express.static('data'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session for admin login
app.use(session({
  secret: 'secure_admin_secret',
  resave: false,
  saveUninitialized: true
}));

// Multer in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔐 Simple admin login
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123';

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/check-auth', (req, res) => {
  if (req.session.admin) {
    return res.sendStatus(200);
  }
  return res.sendStatus(403);
});

// 🔐 Upload folder handler with folderName
app.post('/upload', upload.array('files'), (req, res) => {
  if (!req.session.admin) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const folderName = req.body.folderName;
  if (!folderName) {
    return res.status(400).json({ message: 'Folder name is missing' });
  }

  const basePath = path.join(__dirname, 'data', folderName);
  fs.mkdirSync(basePath, { recursive: true });

  req.files.forEach(file => {
    const filePath = path.join(basePath, file.originalname);
    fs.writeFileSync(filePath, file.buffer);
  });

  res.json({ message: `Folder "${folderName}" uploaded successfully with ${req.files.length} file(s).` });
});

// View image by ID
app.get('/image/:id', (req, res) => {
  const idFolder = path.join(__dirname, 'data', req.params.id);
  if (fs.existsSync(idFolder)) {
    const files = fs.readdirSync(idFolder).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
    if (files.length) {
      return res.json({ imageUrl: `/data/${req.params.id}/${files[0]}` });
    }
  }
  return res.status(404).json({ message: 'ID not found or image missing.' });
});

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
