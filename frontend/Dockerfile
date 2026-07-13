FROM node:20-alpine

WORKDIR /app

# Install deps first (cached layer)
COPY package*.json ./
RUN npm install

# Source copied at build time; volume mount overrides for HMR in dev
COPY . .

EXPOSE 5173

# --host 0.0.0.0 required so Vite binds to all interfaces inside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
