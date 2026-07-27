FROM apify/actor-node-playwright-chrome:22 AS builder

COPY package*.json ./
RUN npm ci --include=dev --audit=false
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM apify/actor-node-playwright-chrome:22

COPY package*.json ./
RUN npm ci --omit=dev --audit=false
COPY --from=builder /home/myuser/dist ./dist
COPY .actor/ ./.actor/

CMD ["node", "dist/main.js"]
