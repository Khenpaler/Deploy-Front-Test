FROM node:20-alpine

WORKDIR /src/app

COPY . .

# Try installing PNPM globally, but continue if it fails
RUN npm install -g pnpm || true

# Install dependencies with PNPM and print a warning if it fails
RUN pnpm install || echo "Warning: PNPM installation failed, continuing build..."

# Try running the build script, but continue if it fails
RUN pnpm run build || echo "Warning: Build step failed, continuing build..."

EXPOSE 3000

# Use npm to start the app
CMD ["npm", "start"]
