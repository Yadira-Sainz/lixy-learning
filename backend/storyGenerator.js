const OpenAI = require('openai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateContent(words, categoryName) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("API key is not set. Please check your .env file.");
    throw new Error("OpenAI API key is not set");
  }

  const storyPrompt = `Write a short story or a small article for beginner to intermediate language learners on the theme of ${categoryName}. The story or article should include the following words: ${words.join(', ')}. It should be around 300 words. The language should be simple and easy to understand, and the content should either describe a scene (for the story) or provide clear, useful information (for the article). Generate a fitting title for the story or article. Keep the text plain, without using bolds or italics. Return the result as a JSON object with the following structure:
  {
    "title": "The title of the story or article",
    "content": "The story or article content"
  }`;

  const quizPrompt = `Based on the story you just generated, create 3 multiple-choice questions. Each question should have 4 options, with only one correct answer. Format the output as a JSON array of objects, where each object represents a question and has the following structure:
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The correct option"
  }`;

  try {
    console.log('Sending story prompt to OpenAI API:', storyPrompt);
    const storyCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: storyPrompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const storyResponse = JSON.parse(storyCompletion.choices[0].message.content);

    console.log('Generated story title:', storyResponse.title);
    console.log('Generated story content (first 100 characters):', storyResponse.content.substring(0, 100));

    // Generate quiz questions
    console.log('Sending quiz prompt to OpenAI API');
    const quizCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: JSON.stringify(storyResponse) },
        { role: "user", content: quizPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const quizResponse = JSON.parse(quizCompletion.choices[0].message.content);

    console.log('Generated quiz questions:', quizResponse);

    return {
      story: storyResponse,
      quizQuestions: quizResponse
    };
  } catch (error) {
    console.error("Error occurred in generateContent:", error);
    throw new Error(`Failed to generate content: ${error.message}`);
  }
}

module.exports = { generateContent };