# UniHelp

## Overview

**UniHelp** is a hybrid mobile and web (PWA) application developed using **Ionic + Angular** for the frontend and **Flask (Python)** for the backend.UniHelp aims to support university students throughout their academic process by providing a centralized and intelligent environment for managing study materials, connecting with peers, and leveraging AI assistance.
It offers a seamless mobile and web experience (via PWA) that allows students to upload, explore, and interact with academic content efficiently.

---

## Key Features

- User authentication (JWT-secured)
- Upload and browse notes, slides, and exercises
- Favorites and user profile management
- Real-time push notifications via **Firebase Cloud Messaging (FCM)**
- AI-powered “Thinkerbell” assistant using **RAG pipeline (FAISS + OpenAI Embeddings)**
- Integrated scoring and points system
- Hybrid design supporting both **mobile** and **progressive web app (PWA)** use

---

## Tech Stack

**Frontend:**

- Ionic + Angular
- Capacitor for native builds
- TypeScript, HTML, SCSS

**Backend:**

- Flask (Python)
- MySQL / SQLAlchemy
- JWT Authentication
- Flask Blueprints modular architecture

**AI & Cloud Services:**

- Firebase Cloud Messaging (Push Notifications)
- FAISS Vector Database for semantic search
- OpenAI Embeddings + GPT models for RAG (Retrieval-Augmented Generation)
- LangChain integration

---

## System Architecture

```
Frontend (Ionic Angular + Capacitor)
       ↓ REST API (HTTPS)
Backend (Flask Python)
       ↓
MySQL Database
       ↓
AI Services (FAISS + OpenAI + LangChain)

Frontend ↔ FCM ↔ Backend

```

---

## Demo Video

[![UniHelp Demo Video](https://img.youtube.com/vi/1gppOfO6knI/mqdefault.jpg)](https://youtu.be/1gppOfO6knI)

---

## Admin Dashboard

The UniHelp Admin Dashboard is a complementary web-based management system built with Angular + Ionic, allowing administrators to monitor platform activity, manage reports, and view user statistics.
It supports Single Sign-On (SSO) integration with the main UniHelp system, while also allowing independent administrator login for isolated management environments when required.

See the separate repository here: [UniHelp Admin Dashboard](https://github.com/evelinastavropoulou/unihelp-admin)

---

## About the Project

This project was developed as part of the **Diploma Thesis** at the
**Department of Computer Engineering and Informatics**,
**University of Patras (Greece)**.

---

## License

This project is for academic and research purposes only.
All rights reserved © 2025.
