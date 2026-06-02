import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Custom Google Embeddings wrapper to force 768 dimensions
class CustomGoogleGenerativeAIEmbeddings extends GoogleGenerativeAIEmbeddings {
  _convertToContent(text) {
    const cleanedText = this.stripNewLines ? text.replace(/\n/g, " ") : text;
    return {
      content: { role: "user", parts: [{ text: cleanedText }] },
      taskType: this.taskType,
      title: this.title,
      outputDimensionality: 768,
    };
  }
}

// Initialize embedding model
const embeddings = new CustomGoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
});

// Connect to Pinecone Index
const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY,
});
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
  pineconeIndex,
});

// Configure Retriever
const retriever = vectorStore.asRetriever(4);

// Initialize Gemini LLM
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.2,
  maxRetries: 1, // Fail fast on 429 Rate Limits instead of hanging indefinitely
});

// Prompt for rephrasing follow-up questions
const rephrasePrompt = ChatPromptTemplate.fromMessages([
  ["system", "Given the following conversation history and a follow-up question, rephrase the follow-up question to be a standalone question in its original language. If the question is already a standalone question, return it as is."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{question}"]
]);

const rephraseChain = rephrasePrompt.pipe(model).pipe(new StringOutputParser());

// Prompt for answering based on context and history
const qaPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a helpful assistant specialized in answering questions about the company's policies.
Use the following pieces of context to answer the user's question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.

Language Rule: Detect the language of the user's input (e.g., English, Hindi, Hinglish, etc.) and answer in the EXACT SAME language and style. If they ask in Hindi/Hinglish (e.g., "simple me batao"), translate the core facts from the English context naturally into clear, conversational Hindi/Hinglish.

Context:
{context}`],
  new MessagesPlaceholder("chat_history"),
  ["human", "{question}"]
]);

const qaChain = qaPrompt.pipe(model).pipe(new StringOutputParser());

// Formatting helper for retrieved documents
function formatDocs(docs) {
  return docs.map((doc) => doc.pageContent).join("\n\n");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS middleware for independent frontend execution
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

// Helper function to retry API calls on 429/503 temporary errors
async function callWithRetry(fn, retries = 2, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const status = error?.status;
      const isRetryable = status === 429 || status === 503;
      if (isRetryable && i < retries - 1) {
        console.log(`⚠️ Temporary API error (${status}). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Map to hold session-based conversation histories
const sessions = new Map();

app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const activeSessionId = sessionId || "default_session";
  if (!sessions.has(activeSessionId)) {
    sessions.set(activeSessionId, []);
  }
  const chatHistory = sessions.get(activeSessionId);

  try {
    // 1. Retrieve relevant context documents directly using the raw message.
    // This reduces LLM calls by 50% on follow-ups and prevents 429/503 rate limit errors.
    const docs = await retriever.invoke(message);
    const context = formatDocs(docs);

    // 2. Generate final answer passing both context and history
    const response = await callWithRetry(() => qaChain.invoke({
      context,
      chat_history: chatHistory,
      question: message,
    }));

    // 4. Update chat history
    chatHistory.push(new HumanMessage(message));
    chatHistory.push(new AIMessage(response));
    
    // Prune history to avoid token size blow-up
    if (chatHistory.length > 20) {
      chatHistory.splice(0, 2);
    }

    return res.json({ response });
  } catch (error) {
    console.error("Error generating answer:", error);
    return res.status(500).json({ error: "Error generating answer" });
  }
});

app.listen(PORT, () => {
  console.log("\n==========================================");
  console.log(`   Company Policy Chatbot Running 🤖`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log("==========================================\n");
});

// Prevent Node process from crashing on unhandled promise rejections or exceptions
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("⚠️ Uncaught Exception thrown:", error);
});

export default app;

