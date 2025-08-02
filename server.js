// server.js - AFT Chatbot Backend with Pinecone Integration
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import tiktoken from 'tiktoken';
const getEncoding = tiktoken.getEncoding;

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// OpenAI initialization
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Pinecone initialization
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index('aft-chatbot');
const NAMESPACE = 'aft-services';

// Helper: Chunk input text
function chunkText(text, chunkSize = 500, overlap = 50) {
  const enc = getEncoding("cl100k_base");
  const tokens = enc.encode(text);
  const chunks = [];
  for (let i = 0; i < tokens.length; i += chunkSize - overlap) {
    const chunk = tokens.slice(i, i + chunkSize);
    chunks.push(enc.decode(chunk));
  }
  return chunks;
}

// Helper: Embed text using OpenAI
async function embedText(texts) {
  const response = await openai.embeddings.create({
    input: texts,
    model: 'text-embedding-ada-002'
  });
  return response.data.map(obj => obj.embedding);
}

// Route: POST /chat
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ reply: "No message provided." });
  }

  try {
    // 1. Embed the user message
    const embeddedUserQuestion = (await embedText([userMessage]))[0];

    // 2. Query Pinecone index
const queryResult = await index.query(
  {
    vector: embeddedUserQuestion,
    topK: 5,
    includeMetadata: true
  },
  {
    namespace: NAMESPACE
  }
);

    // 3. Prepare context
    const contextChunks = queryResult.matches?.map(match => match.metadata?.text || '').join('\n---\n');
    const prompt = `You are AFT's AI Assistant. Use the information below to help answer the user's question.\n\nContext:\n${contextChunks}\n\nQuestion: ${userMessage}\nAnswer:`;

    // 4. Send to OpenAI for final answer
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful and informative assistant for Applied Future Technologies (AFT).' },
        { role: 'user', content: prompt }
      ]
    });

    const answer = completion.choices[0]?.message?.content || "I'm sorry, I don't have an answer at the moment.";
    res.json({ reply: answer });
  } catch (err) {
    console.error("❌ Error in /chat:", err);
    res.status(500).json({ reply: "There was an error processing your request." });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ AFT Chatbot backend is running on port ${port}`);
});
