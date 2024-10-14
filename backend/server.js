const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config();
const { generateContent } = require('./storyGenerator'); 
const app = express();
const port = 5000;

// CORS configuration
const allowedOrigins = process.env.NEXT_PUBLIC_FRONTEND_URLS;
app.use(cors({
  origin: allowedOrigins,
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  credentials: true
}));
app.options('*', cors());

app.use(bodyParser.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// User registration route
app.post('/register', async (req, res) => {
  const { first_name, last_name, username, email, password, age, gender, country, native_language, learning_language } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, username, email, password_hash, age, gender, country, native_language_id, learning_language_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [first_name, last_name, username, email, hashedPassword, age, gender, country, native_language, learning_language]
    );
    const token = jwt.sign({ userId: result.rows[0].user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User profile route
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, email, first_name, last_name, username, age, gender, country, native_language_id, learning_language_id FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User update route
app.put('/api/update-user', authenticateToken, async (req, res) => {
  const { first_name, last_name, username, email, password, age, gender, country, native_language_id, learning_language_id } = req.body;

  try {
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const query = `
      UPDATE users 
      SET email = $1, first_name = $2, last_name = $3, age = $4, gender = $5, country = $6, 
          native_language_id = $7, learning_language_id = $8, 
          password_hash = COALESCE($9, password_hash), username = $10
      WHERE user_id = $11
      RETURNING *;
    `;
    const values = [
      email, first_name, last_name, age, gender, country, 
      native_language_id, learning_language_id, hashedPassword, username, req.user.userId
    ];

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
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

// Route to fetch available languages
app.get('/languages', async (req, res) => {
  try {
    const result = await pool.query('SELECT language_id, language_name FROM languages');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to fetch vocabulary by category
app.get('/api/vocabulary/:categoryId', authenticateToken, async (req, res) => {
  const { categoryId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM vocabulary WHERE category_id = $1',
      [categoryId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to fetch categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT category_id, category_name FROM categories');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vocabulary/:categoryId', authenticateToken, async (req, res) => {
  const { categoryId } = req.params;
  
  try {
    console.log(`Fetching vocabulary for category ${categoryId}`);
    const result = await pool.query(
      'SELECT * FROM vocabulary WHERE category_id = $1',
      [categoryId]
    );
    console.log(`Fetched ${result.rows.length} vocabulary items`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching vocabulary:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/generate-content', authenticateToken, async (req, res) => {
  const { words, categoryId } = req.query;

  try {
    console.log(`Generating content for category ${categoryId} with words: ${words}`);
    // Fetch the category name from the database
    const categoryResult = await pool.query('SELECT category_name FROM categories WHERE category_id = $1', [categoryId]);
    
    if (categoryResult.rows.length === 0) {
      console.error(`Category not found for id ${categoryId}`);
      return res.status(404).json({ error: 'Category not found' });
    }

    const categoryName = categoryResult.rows[0].category_name;

    // Split the words string into an array
    const wordsArray = words.split(',');

    const stories = await generateContent(wordsArray, categoryName);
    console.log('Generated story:', stories[0]);
    res.json({ stories });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
