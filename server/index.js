const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

console.log('Environment variables loaded:', {
  hasApiKey: !!process.env.REACT_APP_OPENAI_API_KEY,
  apiKeyLength: process.env.REACT_APP_OPENAI_API_KEY?.length
});

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
});

app.post('/generate-questions', async (req, res) => {
  try {
    const { jobDescription } = req.body;
    console.log('Received job description:', jobDescription);
    console.log('API Key status:', {
      exists: !!process.env.REACT_APP_OPENAI_API_KEY,
      length: process.env.REACT_APP_OPENAI_API_KEY?.length,
      firstChars: process.env.REACT_APP_OPENAI_API_KEY?.substring(0, 10) + '...'
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert technical interviewer."
        },
        {
          role: "user",
          content: `Generate 5 technical interview questions based on the following job description:\n\n${jobDescription}`
        }
      ],
      temperature: 0.7,
    });

    console.log('OpenAI response received:', completion.choices[0].message.content);
    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      status: error.status,
      response: error.response?.data,
      stack: error.stack,
      type: error.type,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to generate questions', 
      details: error.message,
      type: error.type,
      code: error.code
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 