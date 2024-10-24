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
const textToSpeech = require('@google-cloud/text-to-speech');
const path = require('path');
const fs = require('fs');
const util = require('util');
const fetch = require('node-fetch');

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

// Generate text to speech
app.post('/api/generate-audio', authenticateToken, async (req, res) => {
  const { sentence } = req.body;

  if (!sentence) {
    return res.status(400).json({ error: 'Sentence is required' });
  }

  try {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`;

    const requestBody = {
      input: { text: sentence },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Standard-H',  // specific voice
        ssmlGender: 'MALE'         // Voice gender
      },
      audioConfig: { audioEncoding: 'MP3' }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.audioContent) {
      // Save the audio file on the server
      const buffer = Buffer.from(data.audioContent, 'base64');
      const fileName = `audio-${Date.now()}.mp3`;
      const filePath = path.join(__dirname, 'audios', fileName);

      // Directory "audios".
      if (!fs.existsSync(path.join(__dirname, 'audios'))) {
        fs.mkdirSync(path.join(__dirname, 'audios'));
      }

      await util.promisify(fs.writeFile)(filePath, buffer);

      // Send the URL of the audio file to the client
      res.json({ audioUrl: `/audios/${fileName}` });

      // Delete the file after a while (optional, if you want to clean the server after a while)
      setTimeout(() => {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting audio file:', err);
          }
        });
      }, 60000); // Delete file after 60 seconds (optional)

    } else {
      res.status(500).json({ error: 'Error generating audio' });
    }

  } catch (err) {
    console.error('Error generating audio:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serves audio files
app.use('/audios', express.static(path.join(__dirname, 'audios')));

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

    const result = await generateContent(wordsArray, categoryName);
    console.log('Generated story:', result.story);
    console.log('Generated quiz questions:', result.quizQuestions);
    res.json(result);
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content', details: error.message });
  }
});

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
      return res.status(404).json({ error: 'No image  found for the word' });
    }
  } catch (err) {
    console.error('Error fetching image URL:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function for calculating the next revision date
function calculateNextReviewDate(familiarity_level_id) {
  const now = new Date();
  switch (familiarity_level_id) {
    case 1: // New
      return now.setDate(now.getDate() + 1);
    case 2: // Recognized
      return now.setDate(now.getDate() + 2);
    case 3: // Familiar
      return now.setDate(now.getDate() + 5);
    case 4:  // Learned
      return now.setDate(now.getDate() + 7);
    case 5: // Known
      return now.setDate(now.getDate() + 14);
    default:
      return now;
  }
}

// Next session (words to review)
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

//Update progress
app.post('/api/update-progress', authenticateToken, async (req, res) => {
  const { wordId, correct } = req.body;
  const userId = req.user.userId;

  try {
    const progress = await pool.query(`
      SELECT familiarity_level_id, correct_answers, incorrect_answers
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
      if (familiarity_level_id === 1 && correct_answers >= 1) familiarity_level_id = 2; // New → Recognized
      else if (familiarity_level_id === 2 && correct_answers >= 3) familiarity_level_id = 3; // Recognized → Familiar
      else if (familiarity_level_id === 3 && correct_answers >= 5) familiarity_level_id = 4; // Familiar → Learned
      else if (familiarity_level_id === 4 && correct_answers >= 7) familiarity_level_id = 5; // Learned → Known
    } else {
      incorrect_answers += 1;
      if (familiarity_level_id > 1) familiarity_level_id = 2; // Regresar a Recognized si es incorrecto
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

// Update user progress by word
app.post('/api/update-progress', authenticateToken, async (req, res) => {
  const { wordId, correct } = req.body;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `UPDATE familiarity
       SET correct_answers = correct_answers + $1,
           incorrect_answers = incorrect_answers + $2,
           last_reviewed = NOW(),
           next_review_date = CASE
                               WHEN $1 = 1 THEN NOW() + INTERVAL '1 day' -- Ejemplo de cómo podrías actualizar la fecha
                               ELSE NOW() + INTERVAL '1 hour'
                             END
       WHERE user_id = $3 AND word_id = $4
       RETURNING *`,
      [correct ? 1 : 0, correct ? 0 : 1, userId, wordId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    res.json({ message: 'Progress updated successfully', progress: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error updating progress' });
  }
});

// Route to fetch the daily words for a user based on their familiarity and spaced repetition algorithm
app.get('/api/daily-words/:categoryId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { categoryId } = req.params;

  try {
    // Fetch words to be reviewed today based on familiarity level and next review date
    const result = await pool.query(`
      SELECT v.*
      FROM vocabulary v
      JOIN familiarity f ON v.vocabulary_id = f.word_id
      WHERE f.user_id = $1 AND v.category_id = $2 AND f.next_review_date <= NOW()
      ORDER BY f.next_review_date ASC
      LIMIT 20
    `, [userId, categoryId]);

    // If less than 20 words are available, fetch additional new words to fill up the list
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

//Daily streak
app.post('/api/daily-streak', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];

    // Get yesterday's streak, if any
    const yesterdayResult = await pool.query(
      'SELECT current_streak FROM daily_streaks WHERE user_id = $1 AND streak_date = $2',
      [userId, yesterday]
    );

    let newCurrentStreak = 1; // If yesterday's streak does not exist, we start a new streak.

    if (yesterdayResult.rows.length > 0) {
      // If the user complied yesterday, increase the current streak.
      newCurrentStreak = yesterdayResult.rows[0].current_streak + 1;
    }

    // Obtain the longest previous streak
    const longestResult = await pool.query(
      'SELECT longest_streak FROM daily_streaks WHERE user_id = $1 ORDER BY longest_streak DESC LIMIT 1',
      [userId]
    );

    let newLongestStreak = longestResult.rows.length > 0 ? longestResult.rows[0].longest_streak : 0;

    // If the current new streak is longer than the longest streak, update the longest streak.
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }

    // Check if a registration already exists for today
    const result = await pool.query(
      'SELECT * FROM daily_streaks WHERE user_id = $1 AND streak_date = $2',
      [userId, today]
    );

    if (result.rows.length > 0) {
      // Update if a record already exists for today
      await pool.query(
        'UPDATE daily_streaks SET current_streak = $1, longest_streak = $2 WHERE user_id = $3 AND streak_date = $4',
        [newCurrentStreak, newLongestStreak, userId, today]
      );
    } else {
      // Insert a new record if it does not exist today
      await pool.query(
        'INSERT INTO daily_streaks (user_id, streak_date, current_streak, longest_streak) VALUES ($1, $2, $3, $4)',
        [userId, today, newCurrentStreak, newLongestStreak]
      );
    }

    return res.status(200).json({ message: 'Racha diaria actualizada', currentStreak: newCurrentStreak, longestStreak: newLongestStreak });
  } catch (error) {
    console.error('Error updating daily streak:', error);
    return res.status(500).json({ error: 'Error updating daily streak' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});