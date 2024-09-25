const express = require('express');
const cors = require('cors');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
const port = 5000;

app.use(cors()); // Enable CORS for all routes

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/api/english/most-used-words', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(['provide 100 words in english, only the listseparated by commas and no other text']);
    res.json(result.response.text());
  } catch (error) {
    console.error('Error fetching data from Gemini API:', error);
    res.status(500).send('Error fetching data from Gemini API');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
