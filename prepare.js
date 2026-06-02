import "dotenv/config";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

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

const embeddings = new CustomGoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
});


async function indexDocument(filePath) {
  try {
    console.log("Loading PDF file:", filePath);

    const loader = new PDFLoader(filePath, {
      splitPages: false,
    });

    const docs = await loader.load();

    if (!docs.length) {
      console.log("No content found in PDF.");
      return;
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });

    console.log("Splitting PDF into chunks...");
    const chunks = await splitter.splitDocuments(docs);
    console.log("Total chunks generated:", chunks.length);

    console.log("Initializing Pinecone client...");
    const pinecone = new PineconeClient({
      apiKey: process.env.PINECONE_API_KEY,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

    console.log("Sending embeddings and documents to Pinecone...");
    // PineconeStore.fromDocuments handles embedding and uploading
    const vectorStore = await PineconeStore.fromDocuments(chunks, embeddings, {
      pineconeIndex,
      maxConcurrency: 5,
    });
    console.log("Upload completed! Vectors are now in Pinecone.");

    // Perform a test semantic search to verify
    const query = "What is the paid leave policy?";
    console.log(`\n🔍 Testing Search Query: "${query}"`);
    const results = await vectorStore.similaritySearch(query, 2);

    console.log("\n=== Semantic Search Results ===");
    results.forEach((chunk, index) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log(chunk.pageContent);
      console.log("------------------------");
    });

  } catch (error) {
    console.error("Error processing PDF:", error);
  }
}

indexDocument("./Company_Policy_Handbook_Test_RAG.pdf");

