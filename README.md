# Gigly

A gig platform built with NestJS (backend) and React + Vite (frontend).

## Quick Start with Docker

Everything you need to run the application is containerized.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running the Application

1. **Clone the repository** (if you haven't already).
2. **Start the services**:
   ```bash
   docker-compose up --build
   ```
   This will start:
   - **PostgreSQL**: The database (on port 5432).
   - **Backend**: NestJS API (on port 3000).
   - **Frontend**: Vite development server (on port 5173).

3. **Access the Application**:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3000](http://localhost:3000)

### Environment Variables

The services are pre-configured to work together out of the box using Docker.

- **Backend**: Uses `.env` in the `backend/` directory. The `DATABASE_URL` is overridden by Docker Compose to point to the `db` service.
- **Frontend**: You can configure `VITE_API_URL` if you run the services on different hosts. By default, it points to `http://localhost:3000`.

### Database Migrations

When the backend container starts, it automatically runs `prisma migrate deploy` to ensure the database schema is up to date.

## Project Structure

- `backend/`: NestJS application.
- `frontend/`: React + Vite application.
- `docker-compose.yml`: Orchestrates the containers.
