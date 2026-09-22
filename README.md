# 🎭 Imposter Game Score Management Platform

A full-stack web application for managing scores and statistics in a social
deduction game. Built with React.js, Node.js, Express.js, and MongoDB.

## Features

- **User Authentication** – Register, login, JWT-based sessions
- **Privacy Controls** – Public or private score profiles
- **Dynamic Team Management** – Auto-generate names from themed categories 
  (movies, comedy characters, animals, mythical creatures); edit any time
- **Game Logic & Voting** – Select imposters, cast votes, auto-calculate 
  scores based on identification outcomes
- **Floor Limit** – Optional constraint to prevent negative scores
- **History** – Day/month/period filtering, detailed round-by-round review
- **Favorites** – Save games into custom categories with notes

## Quick Start

### Prerequisites
- Node.js 16+  
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install
cp .env.example .env   # edit MONGODB_URI and JWT_SECRET
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm start