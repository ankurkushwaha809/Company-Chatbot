# 🤖 Enterprise Policy Chatbot — RAG Architecture

[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-v4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![LangChain](https://img.shields.io/badge/LangChain-v0.3-1C3C3C?style=for-the-badge&logo=chainlink&logoColor=white)](https://langchain.com)
[![Pinecone](https://img.shields.io/badge/Pinecone-VectorDB-000000?style=for-the-badge&logo=pinecone&logoColor=white)](https://pinecone.io)
[![Gemini](https://img.shields.io/badge/Gemini_API-2.5_Flash-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini)

This repository contains the production-ready implementation of an **Enterprise HR Chatbot**. It utilizes **Retrieval-Augmented Generation (RAG)**, integrating Google Gemini and Pinecone to provide factually correct, context-grounded answers about company policy guidelines (leaves, hybrid work, and security rules) with multi-language (English/Hindi/Hinglish) support.

---

## 📐 System Architecture Flow

The system operates across two key pipelines: **Document Ingestion** (offline preparation) and **Query & Inference** (online runtime).

```mermaid
graph TD
  subgraph Ingestion Pipeline (Offline)
    A[Company Policy PDF] --> B[Load & Chunk Text]
    B --> C[Custom Gemini Embeddings]
    C --> D[(Pinecone Vector DB)]
  end

  subgraph Query & Chat Pipeline (Online)
    E[User Query / Chat UI] --> F{Check Session ID}
    F -->|Fetch History| G[Retrieve Context from Pinecone]
    G --> H[Unified Prompt Context + History]
    H --> I[Gemini 2.5 Flash LLM]
    I -->|Smart Retry / Cooldown| J[Client Chat Bubble]
  end

  D -.-> G
```

### Monospace System Architecture Layout

```text
+---------------------------------------------------------------------------------------------------+
|                                         RAG ARCHITECTURE                                          |
+---------------------------------------------------------------------------------------------------+
                                                                                                     
  RAG                                                                                                
                                                                                                     
  +-------------------------------------+         +---------------+         +-----------------------+
  | How many paid leaves are            | - - - > |   RETRIEVAL   | - - - > |          LLM          |
  | allowed in our company              |         +---------------+         +-----------------------+
  | policy?                             |            ^ ^     ^ ^               ^             |       
  +-------------------------------------+            | |     | |               |             |       
                                                     | |     | |               |             v       
                                    +----------------+ |     | +-------------+ |     +---------------+
                                    |                  |     |               | |     | The company   |
                                    |   +--------------+     +-----------+   | |     | paid leaves   |
                                    |   |                                |   | |     | 24 paid leaves|
                                    v   v                                v   v |     | policy:       |
  ==================================|===|================================|===|======================
                                    |   |                                |   | |     | - 12 Casual   |
                                    |   |                                |   | |     | - 6 Sick      |
                                    |   |                                |   | |     | - 6 Privilege |
                                    v   v                                v   v |     +---------------+
                                  +---------------+                    +---------------+             
                                  |   Embedding   |                    |    Vector     |             
  +---------------+  +---------+  |     Model     |                    |   database    |             
  |    Company    |  |         |  |               |                    |               |             
  |  policy docs  |->| Chunks  |->|  (Generates   | - - - - - - - - - >|     (===)     |             
  |               |  |         |  |   Vectors)    |                    |     (===)     |             
  +---------------+  +---------+  +---------------+                    +---------------+             
                                                                        Vector database              
```

---

## 🧠 Architectural Theory & System Mechanics

### 1. What is RAG (Retrieval-Augmented Generation)?
Standard Large Language Models (LLMs) answer questions using their pre-trained, static knowledge, which makes them prone to **hallucinations** (generating false information) and unable to access private documents. 

**RAG** solves this by:
* **Retrieving** highly relevant factual passages (context) from a private knowledge source (like your leave policy documents).
* **Augmenting** the user prompt with these retrieved passages and the conversational history.
* **Generating** a response strictly grounded in that verified context, matching the user's input language.

---

## 🗂️ Project Directory Structure

The workspace has been decoupled into clean, separate **Frontend** and **Backend** directories:

```text
company-chatbot/
│
├── backend/                     # Express API Server & RAG Engine
│   ├── .env                     # API Keys & DB Config
│   ├── index.js                 # Express Application Entry Point
│   ├── prepare.js               # Document Ingestion Script (PDF -> Vector Store)
│   ├── test_connection.js       # Diagnostics Connection Script
│   ├── package.json             # Backend dependencies (Express, LangChain, Pinecone)
│   └── Company_Policy_Handbook_Test_RAG.pdf  # Source policy manual
│
├── frontend/                    # Light-themed Static Client Pages
│   ├── index.html               # Corporate website landing page
│   ├── style.css                # Premium custom stylesheet with a light theme
│   └── app.js                   # UI controls, chat toggle & Fetch handlers
│
└── README.md                    # Primary Documentation (This File)
```

---

## 🚀 Setup & Installation

### Prerequisites
* **Node.js** (v22.0.0 or higher recommended)
* A **Pinecone Index** (dimension `768`, cosine metric)
* A **Google Gemini API Key**

### 1. Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file in the `backend/` folder:
   ```env
   GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
   PINECONE_API_KEY="YOUR_PINECONE_API_KEY"
   PINECONE_INDEX_NAME="YOUR_INDEX_NAME"
   ```
3. Install dependencies (due to peer conflicts with LangChain community packages, use the `--legacy-peer-deps` flag):
   ```bash
   npm install --legacy-peer-deps
   ```
4. **Data Ingestion (Optional)**: If you haven't split and uploaded the PDF to Pinecone yet, run the preparer script:
   ```bash
   node prepare.js
   ```
5. Start the backend Express server:
   ```bash
   npm run dev
   ```
   *The server runs by default on `http://localhost:3000`.*

### 2. Frontend Execution
The Express server statically serves the `frontend/` folder automatically.
* Simply open your browser and navigate to **`http://localhost:3000`**.
* Alternatively, you can run the client using extensions like VS Code **Live Server** on `frontend/index.html` (CORS is fully enabled on the backend to allow cross-origin requests).

---

## 🛠️ Performance & Robustness Upgrades

We have implemented advanced production-level optimizations for optimal reliability and speed:

1. **50% Quota Saving & 2x Speed**: Follow-up questions query Pinecone directly using raw inputs. This avoids a separate LLM rephrasing round-trip, saving 50% API calls and reducing the chance of hitting 429 errors.
2. **Fail Fast Config (`maxRetries: 1`)**: Sets Gemini LLM retries to 1. This prevents the server from hanging indefinitely when Google's API key hits rate limits, enabling instant error feedback.
3. **Smart Retry Handler**: The backend Express API interceptor automatically intercepts `429` (Rate Limits) and `503` (Service Overloaded) errors, waits `2000ms`, and transparently retries the request before returning an error to the user.
4. **Crash-Proof Process Guard**: Added global listeners for `unhandledRejection` and `uncaughtException` in `backend/index.js` to ensure the Node process stays online even during network or API breakdowns.

---

## 🧪 Worst-Case Scenario Testing Matrix

Use these 10 tricky questions containing typos, slang, and Hinglish mixtures to validate the chatbot's retrieval logic and conversational accuracy:

| S.No | Language Style | Test Query (Copy-Paste) | Expected Bot Behavior |
| :--- | :--- | :--- | :--- |
| **1** | English (Typos) | `can i save confidencial files on my persnal cloude?` | **Refuses request**: Mentions confidential data is prohibited on personal cloud. |
| **2** | Hinglish (Slang) | `mujee saal me total kitni chutiya millegi aur unka brekdown kya h?` | **Lists 24 leaves**: 12 casual, 6 sick, 6 privilege leaves in Hinglish. |
| **3** | English (Typos) | `what are the minimun days we must work from office every week?` | **States facts**: Mentions it's up to managers, no minimum days listed in PDF. |
| **4** | Hinglish (Slang) | `employees ko apna kaam kiske sath align krna hota h?` | **States alignment**: Customer success, security, and continuous improvement. |
| **5** | English (Tricky) | `can i share my office login MFA or OTP with my manager?` | **Refuses sharing**: States security credentials must remain strictly private. |
| **6** | Hinglish (Slang) | `kya me bachi hui sick leavs agle sal carry forward kr skta hu?` | **Confirms expiry**: Sick leaves do not carry forward. |
| **7** | English (Typos) | `who is responsble for commnicating company overview expectations?` | **Identifies Role**: Managers are responsible. |
| **8** | Hinglish (Slang) | `kya me kisi dusri location se permanently remote kam kr skta hu?` | **Conditional**: Explains HR and Department Head written approval is needed. |
| **9** | English (Boundary) | `can my family member use my office laptop for some urgent work?` | **Refuses sharing**: Devices are strictly for employees only. |
| **10** | Hinglish (Typos) | `kya me apni privilege leavs ko cash me convrt krva skta hu?` | **Explains terms**: Accumulation/encashment terms apply as per HR portal. |