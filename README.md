# Gigly

> A temporary-job marketplace connecting workers with short-term and hourly job opportunities.

**Gigly is currently under active development.**

Gigly is a full-stack web application being built to make it easier for people to find and hire workers for short-term, hourly, and temporary work.

The platform focuses primarily on practical, operational roles such as event staffing, catering, restaurant assistance, cleaning, warehouse work, retail assistance, and similar temporary jobs.

---

## Project Status

🚧 **In Development**

Gigly is currently being developed and is **not yet production-ready**.

The project is being built incrementally, with the backend architecture, authentication, role-based access control, database integration, frontend dashboards, and other core functionality being implemented and refined.

Features may change as development continues.

---

## Core Idea

Gigly is designed around three primary types of users:

### Workers

People looking for temporary, hourly, or short-term work.

Workers will be able to:

* Create and manage their profiles
* Browse available jobs
* Search and filter job opportunities
* View job details
* Apply for jobs
* Track applications
* Manage their work-related information

### Recruiters

Businesses or individuals looking for workers for temporary jobs.

Recruiters will be able to:

* Create and manage recruiter profiles
* Manage company information
* Create job postings
* Manage active job postings
* Review applications
* Manage workers and hiring-related activities

### Administrators

Administrators will be responsible for managing and monitoring the platform.

Administrative functionality includes:

* Platform management
* User management
* Monitoring platform activity
* Managing different user roles
* Administrative dashboards

---

## Example Job Categories

Gigly is focused primarily on short-term and operational work, including areas such as:

* Catering & Food Service
* Restaurant Assistance
* Event Staffing
* Event Setup & Support
* Cleaning & Housekeeping
* Warehouse & Packing
* Loading & Moving Assistance
* Retail Assistance
* Other Temporary / Hourly Work

---

## Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* NestJS
* TypeScript
* Clean Architecture
* Domain-Driven Design principles
* REST APIs

### Database

* PostgreSQL
* Prisma ORM

### Authentication & Authorization

* JWT-based authentication
* Role-Based Access Control (RBAC)
* Roles:

  * `ADMIN`
  * `WORKER`
  * `RECRUITER`

### Development Tools

* Git
* GitHub
* ESLint
* TypeScript
* Prisma

---

## Architecture

The backend follows a layered architecture based on **Clean Architecture and DDD principles**.

The goal is to keep business logic independent from external technologies such as the database, ORM, and HTTP framework.

A simplified representation:

```text
                    Frontend
                       │
                       ▼
                  REST API
                       │
                       ▼
                Presentation
                       │
                       ▼
                 Application
                       │
                       ▼
                    Domain
                       │
                       ▼
                Infrastructure
                       │
                       ▼
                  PostgreSQL
```

The project also uses concepts such as:

* Use Cases
* Repositories
* Domain entities
* DTOs
* Mappers
* Guards
* Dependency inversion
* Role-based authorization

---

## Authentication & Authorization

Gigly uses role-based authentication and authorization.

After authentication, users are associated with one of the supported roles:

```text
ADMIN
WORKER
RECRUITER
```

Each role has access to its corresponding parts of the application.

For example:

```text
ADMIN
  └── /admin/dashboard

WORKER
  └── /worker/dashboard

RECRUITER
  └── /recruiter/dashboard
```

The backend is responsible for enforcing authorization, while the frontend provides route protection and an appropriate user experience.

---

## Project Structure

The project is separated into frontend and backend applications:

```text
giglyInnnnn/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── types/
│   │   └── ...
│   │
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── ...
│   │
│   ├── prisma/
│   └── ...
│
└── README.md
```

The exact structure will continue to evolve as the application grows.

---

## Current Development Focus

Current development is focused on establishing the foundation of the application before implementing the complete marketplace workflow.

Some of the areas currently being developed include:

* User management
* Authentication
* Role-based access control
* Protected routes
* User profiles
* Recruiter profiles
* Company information
* Job posting functionality
* Application management
* Dashboard functionality
* Database integration
* API development
* Backend architecture and separation of concerns

---

## Development Philosophy

Gigly is being developed with an emphasis on building a maintainable backend rather than simply getting features working as quickly as possible.

The project aims to practice and apply concepts such as:

* Clean Architecture
* Domain-Driven Design
* SOLID principles
* Separation of concerns
* Dependency inversion
* Testable business logic
* Secure authentication
* Role-based authorization
* Maintainable database access
* Clear API boundaries

The architecture may evolve as the project grows and new requirements are discovered.

---

## Running the Project

The project contains separate frontend and backend applications.

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> Additional environment variables and database configuration are required. Development setup instructions will be expanded as the project progresses.

---

## Environment Variables

Environment variables are used for configuration such as database connectivity and authentication secrets.

Example:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
```

**Do not commit real credentials or secrets to the repository.**

---

## Testing

Testing is being added alongside the implementation of core functionality.

The project currently includes testing around areas such as:

* Authentication
* Authentication context
* Backend use cases
* Authorization
* Role-based access control

Testing coverage will continue to expand as more features are implemented.

---

## Roadmap

The roadmap is subject to change as development progresses.


## Disclaimer

Gigly is currently a **development project** and should not be considered a finished production application.

Features, architecture, database models, APIs, and UI are subject to change during development.

---

## License

License information will be added once the project reaches the appropriate stage of development.

---

## Author

Built as an ongoing full-stack development project with a focus on learning and applying modern backend architecture, authentication, database design, and full-stack development practices. 
