# Use Node.js LTS slim image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies required for typescript and tsx)
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the frontend client assets (compiles code to the /dist directory)
RUN npm run build

# Expose port 3000 (Cloud Run routes external traffic here)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Start the full-stack server
CMD ["npx", "tsx", "server.ts"]
