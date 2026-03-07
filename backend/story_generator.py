import json
import os
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _parse_json_safe(text: str):
    """Parsea JSON tolerando caracteres de control (saltos de línea) que OpenAI a veces incluye."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Reemplazar saltos de línea literales dentro de strings que rompen JSON
        def replace_in_strings(match):
            s = match.group(1)
            s = s.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
            return '"' + s + '"'
        fixed = re.sub(r'"((?:[^"\\]|\\.)*)"', replace_in_strings, text, flags=re.DOTALL)
        return json.loads(fixed)


async def generate_content(words: list[str], category_name: str) -> dict:
    if not os.environ.get("OPENAI_API_KEY"):
        raise ValueError("OpenAI API key is not set")

    story_prompt = f"""Write a short story or a small article for beginner to intermediate language learners on the theme of {category_name}. The story or article should include the following words: {', '.join(words)}. It should be around 300 words. The language should be simple and easy to understand, and the content should either describe a scene (for the story) or provide clear, useful information (for the article). Generate a fitting title for the story or article. Keep the text plain, without using bolds or italics. Use \\n for line breaks in the content. Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{{"title": "The title", "content": "The story with \\n for line breaks"}}"""

    quiz_prompt = """Based on the story you just generated, create 3 multiple-choice questions. Each question should have 4 options, with only one correct answer. Format the output as a JSON array of objects, where each object represents a question and has the following structure:
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The correct option"
  }"""

    story_completion = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": story_prompt}],
        temperature=0.7,
        max_tokens=500,
        response_format={"type": "json_object"},
    )
    story_response = _parse_json_safe(story_completion.choices[0].message.content)

    quiz_completion = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": json.dumps(story_response)},
            {"role": "user", "content": quiz_prompt},
        ],
        temperature=0.7,
        max_tokens=500,
    )
    quiz_response = _parse_json_safe(quiz_completion.choices[0].message.content)

    return {"story": story_response, "quizQuestions": quiz_response}
