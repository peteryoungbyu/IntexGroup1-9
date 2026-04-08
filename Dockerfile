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

ENV DEBIAN_FRONTEND=noninteractive
ENV ACCEPT_EULA=Y

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		ca-certificates \
		curl \
		gnupg \
		python3 \
		python3-pip \
		unixodbc \
	&& curl -sSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
	&& echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/microsoft-prod.list \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends msodbcsql18 \
	&& python3 -m pip install --no-cache-dir -r /app/ml-runtime/requirements.txt \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/*

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "Intex.API.dll"]
