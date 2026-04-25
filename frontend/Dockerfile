FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy all code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server (binds to 0.0.0.0 in Docker)
CMD ["npm", "run", "dev", "--", "--host"]