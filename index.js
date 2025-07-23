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

// Ensure tmp directory exists
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

// Multer config: save to tmp folder first
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // temporary name
  }
});
const upload = multer({ storage });

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123';

// Admin login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Check auth
app.get('/check-auth', (req, res) => {
  if (req.session.admin) return res.sendStatus(200);
  return res.sendStatus(403);
});

// Upload files (from tmp to data/<folderName>)
app.post('/upload', upload.array('files'), (req, res) => {
  if (!req.session.admin) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const folderName = req.body.folderName;
  if (!folderName) {
    return res.status(400).json({ message: 'Folder name is missing' });
  }

  const targetDir = path.join(__dirname, 'data', folderName);
  fs.mkdirSync(targetDir, { recursive: true });

  try {
    req.files.forEach(file => {
      const targetPath = path.join(targetDir, file.originalname);
      fs.renameSync(file.path, targetPath); // move file from tmp to final location
    });
    res.json({ message: `Uploaded ${req.files.length} file(s) to /data/${folderName}/` });
  } catch (err) {
    console.error('Error moving files:', err);
    res.status(500).json({ message: 'Error saving files.' });
  }
});

// Serve image from folder by ID
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

// Serve HTML files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
