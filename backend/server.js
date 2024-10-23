const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const OpenAI = require('openai');
const fetch = require('node-fetch');
require('dotenv').config();
const { generateContent } = require('./storyGenerator'); 
const { google } = require('googleapis');

const app = express();
const port = 5000;

// Initialize OpenAI
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

// User Authentication and Management APIs

// Register a new user
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

// User login
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

// Get user profile
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

// Get user details
app.get('/user-details', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT username, email FROM users WHERE user_id = $1', [req.user.userId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
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

// Language and Category APIs

// Get available languages
app.get('/languages', async (req, res) => {
  try {
    const result = await pool.query('SELECT language_id, language_name FROM languages');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT category_id, category_name FROM categories');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vocabulary and Learning APIs

// Get vocabulary by category
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

// Generate a simple sentence
app.post('/api/generate-sentence', authenticateToken, async (req, res) => {
  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
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

// Get image URL for a word
app.post('/api/get-image-url', authenticateToken, async (req, res) => {
  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    const result = await pool.query(
      'SELECT image_url FROM vocabulary WHERE word = $1',
      [word]
    );

    if (result.rows.length > 0 && result.rows[0].image_url) {
      const existingImageUrl = result.rows[0].image_url;
      const isValid = await checkImageUrl(existingImageUrl);

      if (isValid) {
        return res.json({ imageUrl: existingImageUrl });
      }
    }

    const query = encodeURIComponent(word + ' animated');
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${process.env.SEARCH_ENGINE_ID}&searchType=image&key=${process.env.GOOGLE_API_KEY}&num=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const newImageUrl = data.items[0].link;

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

// Story Generation and Retrieval APIs

// Get stories for a specific category
app.get('/api/stories/:categoryId', authenticateToken, async (req, res) => {
  const { categoryId } = req.params;

  try {
    const result = await pool.query(
      'SELECT story_id, title FROM stories WHERE category_id = $1 ORDER BY story_id',
      [categoryId]
    );
    
    const stories = result.rows;
    
    // If there are fewer than 10 stories, add placeholder stories
    while (stories.length < 10) {
      stories.push({
        story_id: `placeholder-${stories.length + 1}`,
        title: `Lectura ${stories.length + 1}`
      });
    }
    
    res.json(stories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Error fetching stories' });
  }
});

// Generate a story
app.get('/api/generate-story', authenticateToken, async (req, res) => {
  const { words, categoryId, storyId } = req.query;

  try {
    console.log(`Generating content for category ${categoryId} with words: ${words}`);
    const categoryResult = await pool.query('SELECT category_name FROM categories WHERE category_id = $1', [categoryId]);
    
    if (categoryResult.rows.length === 0) {
      console.error(`Category not found for id ${categoryId}`);
      return res.status(404).json({ error: 'Category not found' });
    }

    const categoryName = categoryResult.rows[0].category_name;
    const wordsArray = words.split(',');

    const stories = await generateContent(wordsArray, categoryName);
    console.log('Generated story:', stories[0]);

    // Insert or update the story in the database
    const story = stories[0];
    let storyDbId;
    if (storyId && storyId.startsWith('placeholder-')) {
      // Insert new story
      storyDbId = await insertStoryIntoDatabase(story, categoryId);
    } else if (storyId) {
      // Update existing story
      storyDbId = await updateStoryInDatabase(storyId, story);
    } else {
      // Insert new story (this shouldn't happen in normal flow)
      storyDbId = await insertStoryIntoDatabase(story, categoryId);
    }
    
    console.log(`Story inserted/updated with ID: ${storyDbId}`);

    res.json({ story, storyId: storyDbId });
  } catch (error) {
    console.error('Error generating or storing content:', error);
    res.status(500).json({ error: 'Error generating or storing content' });
  }
});

// Get a specific story
app.get('/api/story/:storyId', authenticateToken, async (req, res) => {
  const { storyId } = req.params;
  const { categoryId } = req.query; // Add this line to get categoryId from query params

  try {
    if (storyId.startsWith('placeholder-')) {
      // This is a placeholder story, so we need to generate a new one
      const categoryResult = await pool.query('SELECT category_name FROM categories WHERE category_id = $1', [categoryId]);
      
      if (categoryResult.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const categoryName = categoryResult.rows[0].category_name;

      // Fetch vocabulary for the category
      const vocabularyResult = await pool.query('SELECT word FROM vocabulary WHERE category_id = $1 LIMIT 10', [categoryId]);
      const words = vocabularyResult.rows.map(row => row.word).join(',');

      // Generate new story
      const stories = await generateContent(words.split(','), categoryName);
      const newStory = stories[0];

      // Insert the new story into the database
      const insertedStoryId = await insertStoryIntoDatabase(newStory, categoryId);

      res.json({ ...newStory, story_id: insertedStoryId });
    } else {
      // Fetch existing story
      const result = await pool.query('SELECT * FROM stories WHERE story_id = $1', [storyId]);
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Story not found' });
      }
    }
  } catch (error) {
    console.error('Error fetching or generating story:', error);
    res.status(500).json({ error: 'Error fetching or generating story' });
  }
});

// Progress Tracking APIs

// Calculate next review date based on familiarity level
function calculateNextReviewDate(familiarity_level_id) {
  const now = new Date();
  switch (familiarity_level_id) {
    case 1: return now.setDate(now.getDate() + 1);
    case 2: return now.setDate(now.getDate() + 2);
    case 3: return now.setDate(now.getDate() + 5);
    case 4: return now.setDate(now.getDate() + 7);
    case 5: return now.setDate(now.getDate() + 14);
    default: return now;
  }
}

// Get words for next review session
app.get('/api/next-session', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(`
      SELECT v.word, f.familiarity_level_id, f.next_review_date
      FROM vocabulary v
      JOIN familiarity f ON v.vocabulary_id = f.word_id
      WHERE f.user_id = $1 AND f.next_review_date <= NOW()
      ORDER BY f.next_review_date ASC
      LIMIT 10
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching next session words' });
  }
});

// Update user progress for a word
app.post('/api/update-progress', authenticateToken, async (req, res) => {
  const { wordId, correct } = req.body;
  const userId = req.user.userId;

  try {
    const progress = await pool.query(`
      SELECT  familiarity_level_id, correct_answers, incorrect_answers
      FROM familiarity
      WHERE user_id = $1 AND word_id = $2
    `, [userId, wordId]);

    if (progress.rows.length === 0) {
      // Insert new progress record if it doesn't exist
      const familiarity_level_id = 1;
      const correct_answers = correct ? 1 : 0;
      const incorrect_answers = correct ? 0 : 1;
      const next_review_date = new Date(calculateNextReviewDate(familiarity_level_id)).toISOString();

      await pool.query(`
        INSERT INTO familiarity (user_id, word_id, familiarity_level_id, correct_answers, incorrect_answers, last_reviewed, next_review_date)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      `, [userId, wordId, familiarity_level_id, correct_answers, incorrect_answers, next_review_date]);

      return res.json({ message: 'Progress created successfully' });
    }

    let { familiarity_level_id, correct_answers, incorrect_answers } = progress.rows[0];

    if (correct) {
      correct_answers += 1;
      if (familiarity_level_id === 1 && correct_answers >= 1) familiarity_level_id = 2;
      else if (familiarity_level_id === 2 && correct_answers >= 3) familiarity_level_id = 3;
      else if (familiarity_level_id === 3 && correct_answers >= 5) familiarity_level_id = 4;
      else if (familiarity_level_id === 4 && correct_answers >= 7) familiarity_level_id = 5;
    } else {
      incorrect_answers += 1;
      if (familiarity_level_id > 1) familiarity_level_id = 2;
    }

    const nextReviewDate = new Date(calculateNextReviewDate(familiarity_level_id)).toISOString();

    await pool.query(`
      UPDATE familiarity
      SET familiarity_level_id = $1, correct_answers = $2, incorrect_answers = $3, last_reviewed = NOW(), next_review_date = $4
      WHERE user_id = $5 AND word_id = $6
    `, [familiarity_level_id, correct_answers, incorrect_answers, nextReviewDate, userId, wordId]);

    res.json({ message: 'Progress updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating progress' });
  }
});

// Get daily words for review
app.get('/api/daily-words/:categoryId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { categoryId } = req.params;

  try {
    const result = await pool.query(`
      SELECT v.*
      FROM vocabulary v
      JOIN familiarity f ON v.vocabulary_id = f.word_id
      WHERE f.user_id = $1 AND v.category_id = $2 AND f.next_review_date <= NOW()
      ORDER BY f.next_review_date ASC
      LIMIT 20
    `, [userId, categoryId]);

    if (result.rows.length < 20) {
      const additionalWords = await pool.query(`
        SELECT v.*
        FROM vocabulary v
        LEFT JOIN familiarity f ON v.vocabulary_id = f.word_id AND f.user_id = $1
        WHERE v.category_id = $2 AND f.word_id IS NULL
        LIMIT $3
      `, [userId, categoryId, 20 - result.rows.length]);

      result.rows.push(...additionalWords.rows);
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching daily words:', err);
    res.status(500).json({ error: 'Error fetching daily words' });
  }
});

// Update daily streak
app.post('/api/daily-streak', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];

    const yesterdayResult = await pool.query(
      'SELECT current_streak FROM daily_streaks WHERE user_id = $1 AND streak_date = $2',
      [userId, yesterday]
    );

    let newCurrentStreak = 1;

    if (yesterdayResult.rows.length > 0) {
      newCurrentStreak = yesterdayResult.rows[0].current_streak + 1;
    }

    const longestResult = await pool.query(
      'SELECT longest_streak FROM daily_streaks WHERE user_id = $1 ORDER BY longest_streak DESC LIMIT 1',
      [userId]
    );

    let newLongestStreak = longestResult.rows.length > 0 ? longestResult.rows[0].longest_streak : 0;

    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }

    const result = await pool.query(
      'SELECT * FROM daily_streaks WHERE user_id = $1 AND streak_date = $2',
      [userId, today]
    );

    if (result.rows.length > 0) {
      await pool.query(
        'UPDATE daily_streaks SET current_streak = $1, longest_streak = $2 WHERE user_id = $3 AND streak_date = $4',
        [newCurrentStreak, newLongestStreak, userId, today]
      );
    } else {
      await pool.query(
        'INSERT INTO daily_streaks (user_id, streak_date, current_streak, longest_streak) VALUES ($1, $2, $3, $4)',
        [userId, today, newCurrentStreak, newLongestStreak]
      );
    }

    return res.status(200).json({ message: 'Daily streak updated', currentStreak: newCurrentStreak, longestStreak: newLongestStreak });
  } catch (error) {
    console.error('Error updating daily streak:', error);
    return res.status(500).json({ error: 'Error updating daily streak' });
  }
});

// Helper Functions

// Insert a story into the database
async function insertStoryIntoDatabase(story, categoryId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO stories (title, content, category_id, difficulty_id)
      VALUES ($1, $2, $3, $4)
      RETURNING story_id
    `;

    const difficultyResult = await client.query(
      'SELECT difficulty_id FROM difficulty_levels WHERE difficulty_name = $1',
      ['Not set']
    );
    const difficultyId = difficultyResult.rows[0].difficulty_id;

    const result = await client.query(insertQuery, [
      story.title,
      story.content,
      categoryId,
      difficultyId
    ]);

    await client.query('COMMIT');
    return result.rows[0].story_id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Update an existing story in the database
async function updateStoryInDatabase(storyId, story) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateQuery = `
      UPDATE stories
      SET title = $1, content = $2
      WHERE story_id = $3
      RETURNING story_id
    `;

    const result = await client.query(updateQuery, [
      story.title,
      story.content,
      storyId
    ]);

    await client.query('COMMIT');
    return result.rows[0].story_id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Check if an image URL is valid
const checkImageUrl = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking image URL:', error);
    return false;
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});