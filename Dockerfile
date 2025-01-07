FROM node:20-alpine

WORKDIR /src/app

COPY . .

RUN npm install -g pnpm || true

RUN pnpm install || echo "Warning: PNPM installation failed, continuing build..."

RUN pnpm run build

EXPOSE 3000

CMD ["npm", "start"]
