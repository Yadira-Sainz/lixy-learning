# Lixy Learnig

lixylearning is a language learning platform designed to help users improve their English vocabulary through interactive exercises and engaging content.

## Table of Contents

- Project Overview
- Features
- Tech Stack
- Getting Started
  - Prerequisites
  - Installation
  - Running the Application
- Environment Variables
- Docker Setup
- Contributing
- License
- Contact

## Project Overview

lixylearning aims to provide a comprehensive platform for learning English vocabulary. It leverages modern web technologies to deliver a seamless and interactive learning experience.

## Features

- Interactive vocabulary exercises
- Real-time feedback
- Progress tracking
- Integration with Google Generative AI for content generation

## Tech Stack

- **Frontend:** React
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Deployment:** Docker, GitHub Actions

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Docker
- Docker Compose

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/Yadira-Sainz/lixy-learning.git
   cd lixy-learning

   ```

2. Create a `.env` file in the root directory. Copy from the example:
   ```sh
   cp .env.production.example .env
   ```
   Then edit `.env` and add your actual values. See [docs/VARIABLES_ENTORNO.md](docs/VARIABLES_ENTORNO.md) for full documentation.

   **Variables mínimas para desarrollo local:**
   - `NEXT_PUBLIC_BACKEND_URL=http://localhost:5001`
   - `DATABASE_URL=postgresql://postgres:lixylearning@postgres:5432/lixylearning_db`
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
   - `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `PIXABAY_API_KEY`
   - `JWT_SECRET`

### Running the Application

Build and start the services using Docker Compose:

```sh
docker-compose up --build
```

Access the frontend at http://localhost:3000 and the backend at http://localhost:5001.

### Migración a AWS

Para desplegar en AWS (EC2), consulta el [Manual de Migración a AWS](docs/MANUAL_MIGRACION_AWS.md).

### Docker Setup

The project uses Docker for containerization. The `docker-compose.yml` file defines the services for the frontend, backend, and PostgreSQL database.

**Docker Compose Commands:**
- Start services: `docker-compose up`
- Stop services: `docker-compose down`
- Rebuild images: `docker-compose up --build`

## Contributing

We welcome contributions! Please follow these steps to contribute:

Fork the repository.
Create a new branch (git checkout -b feature/your-feature-name).
Make your changes.
Commit your changes (git commit -m 'Add some feature').
Push to the branch (git push origin feature/your-feature-name).
Open a pull request.
