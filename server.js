// server.js - AFT Chatbot Backend with Logging & Expanded Fallbacks

console.log("🟢🟢🟢 THIS IS THE RIGHT SERVER FILE 🟢🟢🟢");

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import tiktoken from 'tiktoken';

dotenv.config();
const SIMILARITY_THRESHOLD = 0.4; // ⬅️ Lowered threshold
const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const INDEX_NAME = process.env.PINECONE_INDEX;
const NAMESPACE = process.env.PINECONE_NAMESPACE;
const index = pc.index(PINECONE_INDEX);
// const index = pc.index('aft-chatbot');
// const index = pc.index(INDEX_NAME);
// const NAMESPACE = 'aft-services';
console.log("📦 Using Pinecone namespace:", NAMESPACE);

const STATIC_RESPONSES = {
  phone: "(303) 488-3302",
  email: "jcarter@appliedfuture.com",
  address: "1776 South Jackson St. Suite 510, Denver, CO 80210",
  hours: "Monday–Friday, 9:30 AM to 5:00 PM Mountain Time"
};

// ⬆️ Added more flexible patterns
const FALLBACK_TRIGGERS = {
  phone: [/phone/i, /call/i, /contact number/i, /reach you/i],
  email: [/email/i, /e-mail/i],
  address: [/where.*located/i, /your address/i, /location/i],
  hours: [/hours/i, /when.*open/i, /business.*hours/i, /operating.*hours/i, /office.*hours/i, /what time/i]
};

function checkStaticFallback(message) {
  for (const [key, patterns] of Object.entries(FALLBACK_TRIGGERS)) {
    if (patterns.some(regex => regex.test(message))) {
      return STATIC_RESPONSES[key];
    }
  }
  return null;
}

function chunkText(text, chunkSize = 500, overlap = 50) {
  const enc = tiktoken.getEncoding("cl100k_base");
  const tokens = enc.encode(text);
  const chunks = [];
  for (let i = 0; i < tokens.length; i += chunkSize - overlap) {
    const chunk = tokens.slice(i, i + chunkSize);
    chunks.push(enc.decode(chunk));
  }
  return chunks;
}

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
  console.log("📥 Received query:", userMessage); // 🧩 LOGGING B

  if (!userMessage) {
    return res.status(400).json({ reply: "No message provided." });
  }

  const staticResponse = checkStaticFallback(userMessage);
  if (staticResponse) {
    console.log("🔁 Static fallback triggered for:", userMessage); // 🧩 LOGGING C
    return res.json({ reply: staticResponse });
  }

  try {
    const embeddedUserQuestion = (await embedText([userMessage]))[0];

/*    const queryResult = await index.query(
      {
        vector: embeddedUserQuestion,
        topK: 15,
        includeMetadata: true
      },
      {
//        namespace: NAMESPACE
          namespace: process.env.PINECONE_NAMESPACE // ✅ should be 'aft-services'
      }
    );
*/
const queryResult = await index.namespace(NAMESPACE).query({
  vector: embeddedUserQuestion,
  topK: 15,
  includeMetadata: true
});


    console.log("🔍 Retrieved matches:"); // 🧩 LOGGING C
    queryResult.matches?.forEach((match, i) => {
      console.log(`📊 Match ${i + 1}: score=${match.score?.toFixed(3)}, text="${match.metadata?.text?.slice(0, 80)}..."`);
    });
// console.log("🧩 RAW MATCHES FROM PINECONE:");
// console.dir(queryResult.matches, { depth: null });

/*    const prioritizedChunks = queryResult.matches
      ?.filter(m => m.score >= SIMILARITY_THRESHOLD)
      .sort((a, b) => {
        const aIsCompany = a.metadata?.category === 'company_info' ? 1 : 0;
        const bIsCompany = b.metadata?.category === 'company_info' ? 1 : 0;
        return (bIsCompany + b.score) - (aIsCompany + a.score);
      })
      .map(match => match.metadata?.text || '')
      .slice(0, 10)
      .join('\n---\n');
*/
const prioritizedChunks = queryResult.matches
  ?.filter(m => m.score >= SIMILARITY_THRESHOLD)
  .sort((a, b) => {
    const aIsCompany = a.metadata?.category === 'company_info' ? 1 : 0;
    const bIsCompany = b.metadata?.category === 'company_info' ? 1 : 0;
    return (bIsCompany + b.score) - (aIsCompany + a.score);
  })
  .map(match => match.metadata?.text || '')
  .slice(0, 10)
  .join('\n---\n');

    console.log("🧾 Prioritized context chunks:\n", prioritizedChunks?.slice(0, 300)); // 🧩 LOGGING D

    const prompt = `You are AFT's AI Assistant. Use the information below to help answer the user's question.

Context:
${prioritizedChunks}

Question: ${userMessage}
Answer:`;

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

app.listen(port, () => {
  console.log(`✅ AFT Chatbot backend is running on port ${port}`);
});
