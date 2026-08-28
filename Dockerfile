FROM node:20-alpine AS deps
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY server/package.json ./
COPY server/prisma ./prisma
COPY server/src ./src
RUN npx prisma generate
EXPOSE 4000
CMD ["node", "src/index.js"]
