# Lizy Learnig

lizylearning is a language learning platform designed to help users improve their English vocabulary through interactive exercises and engaging content.

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
lizylearning aims to provide a comprehensive platform for learning English vocabulary. It leverages modern web technologies to deliver a seamless and interactive learning experience.

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
   git clone https://github.com/Yadira-Sainz/lizy-learning.git
   cd lizy-learning

2. Create a .env file in the root directory and add the following environment variables:
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgres://lizylearning:lizylearning@localhost:5432/lizylearningdb
POSTGRES_USER=lizylearning
POSTGRES_PASSWORD=lizylearning
POSTGRES_DB=lizylearning
REACT_APP_BACKEND_HOST=localhost

### Running the Application
Build and start the services using Docker Compose:
docker-compose up --build

Access the frontend at http://localhost:3000 and the backend at http://localhost:5000.

Environment Variables
Ensure you have the following environment variables set in your .env file:

GEMINI_API_KEY: Your Gemini API key
DATABASE_URL: PostgreSQL connection string
POSTGRES_USER: PostgreSQL username
POSTGRES_PASSWORD: PostgreSQL password
POSTGRES_DB: PostgreSQL database name
REACT_APP_BACKEND_HOST: Backend host URL for the frontend
Docker Setup

### The project uses Docker for containerization. The docker-compose.yml file defines the services for the frontend, backend, and PostgreSQL database.

### Docker Compose Commands
Start services: docker-compose up
Stop services: docker-compose down
Rebuild images: docker-compose up --build

## Contributing
We welcome contributions! Please follow these steps to contribute:

Fork the repository.
Create a new branch (git checkout -b feature/your-feature-name).
Make your changes.
Commit your changes (git commit -m 'Add some feature').
Push to the branch (git push origin feature/your-feature-name).
Open a pull request.