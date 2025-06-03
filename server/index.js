import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { nanoid } from 'nanoid';

const app = express();
app.use(cors());
app.use(express.json());

const adapter = new JSONFile('./db.json');
const db = new Low(adapter, { users: [] });
await db.read();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function createToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  await db.read();
  const existing = db.data.users.find(u => u.username === username);
  if (existing) return res.status(409).json({ error: 'User exists' });
  const user = { id: nanoid(), username, password, tasks: [], projects: [], notes: [] };
  db.data.users.push(user);
  await db.write();
  res.json({ token: createToken(user.id) });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: createToken(user.id) });
});

app.get('/api/all', auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ tasks: user.tasks || [], projects: user.projects || [], notes: user.notes || [] });
});

['tasks', 'projects', 'notes'].forEach(store => {
  app.put(`/api/${store}`, auth, async (req, res) => {
    await db.read();
    const user = db.data.users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user[store] = req.body || [];
    await db.write();
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on', PORT));
