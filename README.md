# 🚀 Tender Live

<div align="center">

### 🤖 Agentic Tender Discovery & Intelligence Platform

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=24&duration=3000&pause=1000&color=F5B841&center=true&vCenter=true&width=800&lines=AI-Powered+Tender+Intelligence;Multi-Agent+Procurement+Platform;From+Tender+Discovery+to+Tender+Intelligence" />

<br>

![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-Agentic%20AI-blue?style=for-the-badge)
![Backend](https://img.shields.io/badge/FastAPI-Python-green?style=for-the-badge)
![Database](https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge)

</div>

---

## ⚡ Problem

```mermaid
flowchart LR
A[Government Portals] --> B[Hundreds of Tenders]
B --> C[Manual Search]
C --> D[Large PDF Documents]
D --> E[Missed Opportunities]
```

---

## 🚀 Solution

Tender Live converts:

```text
Raw Tender Documents
          ↓
     AI Analysis
          ↓
 Business Intelligence
          ↓
 Better Decisions
```

---

# 🤖 AI Agent Workforce

```mermaid
flowchart LR
A[Discovery Agent] --> B[Document Intelligence Agent]
B --> C[Information Extraction Agent]
C --> D[Eligibility Agent]
D --> E[Summary Agent]
E --> F[Dashboard]
```

### 🔍 Discovery Agent

Finds tenders automatically.

### 📄 Document Intelligence Agent

Reads and understands tender documents.

### 📊 Information Extraction Agent

Extracts eligibility, budget, deadlines.

### ✅ Eligibility Agent

Evaluates company qualification.

### 💡 Summary Agent

Generates insights and recommendations.

---

# 🏗 Architecture

```mermaid
flowchart TD

U[User]
F[React Frontend]
API[FastAPI]
R[Redis]
C[Celery]
DB[PostgreSQL]
AI[Gemini AI]

U --> F
F --> API
API --> R
R --> C
C --> AI
C --> DB
API --> DB
```

---

# ⚡ Asynchronous AI Pipeline

```mermaid
sequenceDiagram

User->>FastAPI: Upload Tender
FastAPI->>Redis: Create Task
FastAPI-->>User: Return Task ID
Redis->>Celery: Queue Job
Celery->>Gemini: Analyze Tender
Gemini-->>Celery: Results
Celery->>Database: Store Results
Database-->>Frontend: Insights
```

---

# 🔥 Tech Stack

| Layer      | Technology         |
| ---------- | ------------------ |
| Frontend   | React + TypeScript |
| Backend    | FastAPI            |
| AI         | Gemini             |
| Queue      | Redis              |
| Workers    | Celery             |
| Database   | PostgreSQL         |
| Real-Time  | SSE                |
| Deployment | Docker             |

---

# 🎯 Features

✅ Multi-Agent AI Workflow

✅ Tender Discovery

✅ Document Intelligence

✅ Eligibility Evaluation

✅ Real-Time Processing

✅ AI Summaries

✅ Insight Generation

---

<div align="center">

## 🚀 Tender Live

### "Businesses should spend time winning tenders, not searching for them."

</div>
