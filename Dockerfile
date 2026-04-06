# Stage 1: Build React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build .NET backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /app
COPY backend/Intex.API/*.csproj ./backend/Intex.API/
RUN dotnet restore ./backend/Intex.API/Intex.API.csproj
COPY backend/Intex.API/ ./backend/Intex.API/
RUN dotnet publish ./backend/Intex.API/Intex.API.csproj -c Release -o /publish

# Stage 3: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=backend-build /publish ./
COPY --from=frontend-build /app/frontend/dist ./wwwroot
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "Intex.API.dll"]
