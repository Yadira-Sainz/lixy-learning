const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = 5000;

// Use the cors middleware
app.use(cors({
  origin: process.env.NEXT_PUBLIC_FRONTEND_URL, // Allow requests from this origin
  methods: 'GET,POST,PUT,DELETE,OPTIONS', // Allow these HTTP methods
  credentials: true // Allow cookies to be sent with requests
}));

// Explicitly handle preflight requests
app.options('*', cors());

app.use(bodyParser.json()); // Parse JSON bodies

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // If no token, return Unauthorized

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // If token is invalid, return Forbidden
    req.user = user;
    next(); // If token is valid, proceed to the next middleware/route handler
  });
};

// Protected route for fetching most used words
app.get('/api/english/most-used-words', authenticateToken, async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(['provide 100 words in english, only the list separated by commas and no other text']);
    res.json(result.response.text());
  } catch (error) {
    console.error('Error fetching data from Gemini API:', error);
    res.status(500).send('Error fetching data from Gemini API');
  }
});

// User registration route
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User details route
app.get('/user-details', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT username, email FROM users WHERE user_id = $1', [req.user.userId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://lixylearning-backend` + `:${port}`);
});
