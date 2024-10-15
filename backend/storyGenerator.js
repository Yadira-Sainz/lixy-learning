const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function generateContent(words, categoryName) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("API key is not set. Please check your .env file.");
    throw new Error("API key is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
  };

  const chatSession = model.startChat({ generationConfig });

  const prompt = `Write a short story or a small article for beginner to intermediate language learners on the theme of ${categoryName}. The story or article should include the following words: ${words.join(', ')}. It should be around 200-300 words. The language should be simple and easy to understand, and the content should either describe a scene (for the story) or provide clear, useful information (for the article). Generate a fitting title for the story or article.`;

  try {
    console.log('Sending prompt to Gemini API:', prompt);
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    // Extract the title and content from the response
    const titleMatch = response.match(/^## (.+)/);
    const title = titleMatch ? titleMatch[1] : "No title found";
    const content = response.replace(/^## (.+)/, "").trim();

    console.log('Generated story title:', title);
    console.log('Generated story content (first 100 characters):', content.substring(0, 100));

    return [{ title, content }];
  } catch (error) {
    console.error("Error occurred in generateContent:", error);
    throw error;
  }
}

module.exports = { generateContent };