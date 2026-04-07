# Intex Group 1-9

## Tech Stack Diagram

```mermaid
flowchart LR
    U[Users]
    B[Browser]
    F[Frontend<br/>React 19 + TypeScript + Vite]
    R[Routing / UI<br/>React Router + Bootstrap + Bootswatch]
    P[Vite Dev Proxy<br/>localhost:3000 -> localhost:5000]
    A[Backend API<br/>ASP.NET Core .NET 10]
    I[Authentication<br/>ASP.NET Identity + Cookies + Google OAuth]
    S[Application Services<br/>Dashboard / Reports / Residents / Supporters / Predictions]
    EF[Data Access<br/>EF Core 10 + SQL Server Provider]
    DB[(Azure SQL / SQL Server)]
    ML[ML Pipelines<br/>Jupyter notebooks in ml-pipelines]
    D[Containerization<br/>Docker multi-stage build]

    U --> B
    B --> F
    F --> R
    F -->|development| P
    P --> A
    F -->|production static files| A
    A --> I
    A --> S
    S --> EF
    EF --> DB
    ML --> DB
    D --> A
    D --> F
```

## Stack Summary

- Frontend: React 19, TypeScript, Vite, React Router, Bootstrap, Bootswatch
- Backend: ASP.NET Core on .NET 10
- Auth: ASP.NET Identity, cookie auth, optional Google OAuth
- Data: Entity Framework Core 10 with SQL Server
- Database: Azure SQL / SQL Server via `AppConnection`
- API Docs: Swagger / Swashbuckle
- Config: `DotNetEnv` for local environment variables
- ML: notebook-based pipelines in [`ml-pipelines`](./ml-pipelines)
- Deployment: Docker multi-stage build with frontend bundled into backend `wwwroot`

## Project Structure

- [`frontend`](./frontend): React client app
- [`backend/Intex.API`](./backend/Intex.API): ASP.NET Core API and Identity setup
- [`ml-pipelines`](./ml-pipelines): machine learning notebooks and experiments
- [`Dockerfile`](./Dockerfile): production container build

## Runtime Architecture

- In development, Vite runs on `http://localhost:3000` and proxies `/api` requests to `https://localhost:5000`.
- In production, the React app is built and served by the ASP.NET Core app from `wwwroot`.
- Both application data and Identity currently connect through the same SQL Server connection string.
