# install packages for pdf rag chatbot from this project
npm install @langchain/community @langchain/core pdf-parse --legacy-peer-deps

## Official Package Links & Documentation
- **LangChain JS Documentation**: [js.langchain.com](https://js.langchain.com/)
- **@langchain/core**: [NPM Package](https://www.npmjs.com/package/@langchain/core)
- **@langchain/community**: [NPM Package](https://www.npmjs.com/package/@langchain/community)
- **pdf-parse**: [NPM Package](https://www.npmjs.com/package/pdf-parse)

## How these packages work together

1. **pdf-parse**: Reads the text from PDF files.
2. **@langchain/core**: Provides the base structure for chains, prompts, and models.
3. **@langchain/community**: Contains integrations for vector stores (like Chroma) and embedding models (like HuggingFaceEmbeddings).

This combination allows you to create a **RAG (Retrieval-Augmented Generation)** pipeline: Load PDF → Embed & Store → Retrieve relevant chunks → Generate answer with LLM.

## How to Run the Project
1. **Initialize/Ingest Data (PDF to Pinecone):**
   ```bash
   npm start
   ```
   *(Runs `prepare.js` to process `Company_Policy_Handbook_Test_RAG.pdf` and upload embeddings to your Pinecone index).*

2. **Start Interactive Chatbot CLI:**
   ```bash
   npm run dev
   ```
   *(Runs `index.js` to query policies interactively).*

