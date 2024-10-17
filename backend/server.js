const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const OpenAI = require('openai');
require('dotenv').config();
const { generateContent } = require('./storyGenerator'); 
const app = express();
const port = 5000;
const { google } = require('googleapis');

// Inicialización de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS configuration
app.use(cors({
  origin: true,
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

// Generate a simple sentence
app.post('/api/generate-sentence', authenticateToken, async (req, res) => {
  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    // Request to OpenAI to generate the sentence
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: `Generate a simple sentence using the word "${word}" in English.` }],
    });

    const generatedSentence = completion.choices[0].message.content;
    res.json({ sentence: generatedSentence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating sentence' });
  }
});

// Translate a sentence from English to Spanish
app.post('/api/translate-sentence', authenticateToken, async (req, res) => {
  const { sentence } = req.body;

  if (!sentence) {
    return res.status(400).json({ error: 'Sentence is required' });
  }

  try {
    // Request to OpenAI to translate the sentence
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: `Translate the following sentence to Spanish: "${sentence}"` }],
    });

    const translatedSentence = completion.choices[0].message.content;
    res.json({ translatedSentence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error translating sentence' });
  }
});

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

// User details route
app.get('/user-details', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT username, email FROM users WHERE user_id = $1', [req.user.userId]);
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

// Route to fetch categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT category_id, category_name FROM categories');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate a story
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

const fetch = require('node-fetch'); // Ensure 'node-fetch' is required if not already

// Function to check if an image URL is valid
const checkImageUrl = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    // If response is OK (200), the image exists
    return response.ok;
  } catch (error) {
    console.error('Error checking image URL:', error);
    return false; // URL is not valid
  }
};

app.post('/api/get-image-url', authenticateToken, async (req, res) => {
  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    // Check if the word already has an image URL in the database
    const result = await pool.query(
      'SELECT image_url FROM vocabulary WHERE word = $1',
      [word]
    );

    // If an image URL exists, check if it's still valid
    if (result.rows.length > 0 && result.rows[0].image_url) {
      const existingImageUrl = result.rows[0].image_url;

      // Check if the image URL is still valid
      const isValid = await checkImageUrl(existingImageUrl);

      if (isValid) {
        return res.json({ imageUrl: existingImageUrl });
      } else {
        console.log(`Image URL '${existingImageUrl}' is no longer valid, fetching a new one...`);
      }
    }

    // Fetch a new image URL if no valid URL is found
    const query = encodeURIComponent(word + ' animated');
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${process.env.SEARCH_ENGINE_ID}&searchType=image&key=${process.env.GOOGLE_API_KEY}&num=1`;

    const response = await fetch(url);
    const data = await response.json();

    console.log('Google Custom Search API Response:', data);

    if (data.items && data.items.length > 0) {
      const newImageUrl = data.items[0].link;

      // Update the database with the new image URL
      await pool.query(
        'UPDATE vocabulary SET image_url = $1 WHERE word = $2',
        [newImageUrl, word]
      );

      return res.json({ imageUrl: newImageUrl });
    } else {
      return res.status(404).json({ error: 'No image found for the word' });
    }
  } catch (err) {
    console.error('Error fetching image URL:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
