# GPT Chatbot Backend

This is a Node.js Express server for handling chatbot conversations using OpenAI's GPT models.

## Setup

1. Clone this repo or unzip the package.
2. Run `npm install` to install dependencies.
3. Create a `.env` file using `.env.example` and add your OpenAI API key.
4. Run `node server.js` or deploy to Render/Vercel.

## Endpoint

- `POST /chat`
  - Body: `{ "message": "your user message" }`
  - Response: `{ "reply": "GPT's response" }`