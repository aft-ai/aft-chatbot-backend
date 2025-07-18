const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

// Optional: Simple FAQ logic (match known questions)
const faq = {
  "what are your business hours": "We’re open from 9am to 5pm, Monday through Friday.",
  "where are you located": "We’re based in Denver, CO.",
  "what services do you offer": "We provide AI consulting services tailored for small and medium businesses.",
 "what is artificial intelligence": "Artificial Intelligence, or AI, refers to computer systems designed to perform tasks that typically require human intelligence. These tasks include things like recognizing speech, understanding language, making decisions, solving problems, and learning from experience. AI can range from simple programs that recommend movies to advanced systems like ChatGPT that understand and generate human-like language.",
  "what is machine learning": "Machine Learning is a branch of AI that enables computers to learn from data and improve over time without being explicitly programmed. For example, a machine learning model can learn to recognize spam emails by analyzing examples of spam and non-spam emails, identifying patterns, and adjusting its filters accordingly.",
  "what is the difference between ai and machine learning": "AI is the broader concept of machines being able to carry out tasks in a way that we would consider smart. Machine Learning is a specific subset of AI that involves algorithms that allow software to improve automatically through experience. In short, all machine learning is AI, but not all AI is machine learning.",
  "what is deep learning": "Deep Learning is a type of machine learning that uses large neural networks with many layers (hence 'deep') to analyze various types of data. It's particularly good at recognizing patterns in images, audio, and text. For example, deep learning powers facial recognition in photos and voice assistants like Siri or Alexa.",
  "how does chatgpt work": "ChatGPT is a type of AI called a language model. It has been trained on a huge amount of text from books, websites, and more. It uses patterns in that data to generate human-like responses to questions and prompts. It doesn’t 'know' things like a human does, but it can produce useful answers based on what it learned during training.",
  "is ai dangerous": "AI itself is not inherently dangerous, but how it’s used can raise concerns. For example, AI used in surveillance or misinformation can have negative effects. There's also concern about bias in AI and job displacement. That’s why it’s important to develop and use AI responsibly.",
  "can ai replace human jobs": "AI can automate certain tasks, which may change how some jobs are done or eliminate repetitive roles. However, it also creates new jobs and can assist humans to be more productive. The goal should be to use AI to enhance human work, not just replace it.",
  "how can i use ai in my business": "AI can help businesses in many ways: automating customer service with chatbots, analyzing data for insights, improving marketing with predictive analytics, or streamlining operations. The key is to identify repetitive tasks or data-heavy processes and explore AI tools that address those needs.",
  "what are the limitations of ai": "AI models don't truly understand information — they find patterns in data. They can make mistakes, especially with ambiguous or biased input. They also require a lot of data to work well and often need human oversight for important decisions.",
  "is ai expensive to implement": "AI doesn't have to be expensive. Many platforms offer low-cost or even free tools for small businesses. Costs depend on what you're trying to achieve — custom AI models cost more, but pre-built tools like chatbots or automation platforms are affordable and quick to set up.",
  "how do i train an ai model": "Training an AI model involves feeding it a large amount of labeled data and allowing it to learn patterns from that data. This typically requires data collection, cleaning, choosing the right model, and using software frameworks like TensorFlow or PyTorch. Luckily, many platforms now offer tools to make this easier without deep technical knowledge.",
  "what is a neural network": "A neural network is a type of computer algorithm inspired by how the human brain works. It’s made of layers of nodes ('neurons') that process input data and pass it forward to produce an output, such as recognizing a face in a photo or translating a sentence.",
  "what is natural language processing": "Natural Language Processing (NLP) is a field of AI focused on enabling computers to understand, interpret, and respond to human language. It’s used in things like chatbots, translation tools, and voice assistants. ChatGPT is an example of an NLP model.",
  "can ai think like a human": "No, AI doesn’t think or feel like a human. It processes data and outputs results based on patterns. It doesn’t have consciousness, emotions, or self-awareness — it’s a tool, not a mind.",
  "how accurate is ai": "AI can be very accurate in well-defined tasks like recognizing images or transcribing speech — sometimes even outperforming humans. But its accuracy depends heavily on the quality of data and how the system is designed. It can still make mistakes and should be used with caution in critical applications.",
  "what are ethical concerns with ai": "AI raises several ethical issues like bias, privacy invasion, surveillance, and the potential misuse of deepfakes. It’s important that AI development includes fairness, transparency, and accountability to avoid harm.",
  "can ai be creative": "AI can generate creative outputs — like writing poems, composing music, or designing logos — but it does so by remixing patterns it has seen before. It doesn’t have intention or originality like human creativity, but it can be a powerful tool for creative work.",
  "what is supervised learning": "Supervised learning is a type of machine learning where the model learns from labeled data — meaning each example in the training set includes both the input and the desired output. This is like teaching a child with flashcards that show both the picture and the word.",
  "what is unsupervised learning": "Unsupervised learning involves feeding the model data without labels. The AI looks for patterns and structures on its own, such as grouping similar items. It’s useful for things like customer segmentation or anomaly detection.",
  "what is reinforcement learning": "Reinforcement learning is where an AI learns by trial and error — it takes actions, receives feedback (rewards or penalties), and learns what strategies lead to better results. It’s how AI learned to play games like chess or Go at superhuman levels.",
  "what is computer vision": "Computer vision is a field of AI that trains computers to interpret and understand visual information like images or video. It’s used in applications like facial recognition, medical imaging, and self-driving cars.",
  "how is ai used in healthcare": "AI helps in healthcare by analyzing medical data, assisting with diagnoses, predicting patient risks, and even powering robots in surgery. It can help doctors make better decisions and streamline hospital operations.",
  "how is ai used in customer service": "AI is used in customer service for chatbots, automated phone systems, and intelligent helpdesks. It can answer common questions, route inquiries to the right person, and be available 24/7 — improving response time and customer satisfaction.",
  "how secure is ai": "AI systems can be secure if designed properly, but they are also vulnerable to attacks if not protected. Hackers can exploit model behavior or input data. That’s why cybersecurity and model testing are crucial parts of AI development.",
  "how can small businesses start using ai": "Small businesses can start with tools like AI chatbots, automated email sorting, customer segmentation, or content generation tools. You don’t need to build models from scratch — many platforms offer easy, no-code solutions tailored to common small business needs.",
}; // This closes the faq object

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const cleanedMessage = message.toLowerCase().replace(/[^\w\s]/gi, '').trim();

    // Check for FAQ match before calling OpenAI
    if (faq[cleanedMessage]) {
  console.log("Matched FAQ:", cleanedMessage);
  return res.json({ reply: faq[cleanedMessage] });
}


    // Otherwise, call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful customer support assistant for Applied Future Technologies. Only answer questions about our business, services, contact information, and common customer FAQs.`,
        },
        { role: 'user', content: message },
      ],
    });

    res.json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Something went wrong');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
