FROM node:20-alpine

WORKDIR /src/app

COPY . .

# Install PNPM globally
RUN npm install -g pnpm

# Install dependencies with PNPM
RUN pnpm install

# Build the Next.js app
RUN pnpm run build

EXPOSE 3000

# Start the Next.js app
CMD ["pnpm", "start"]
