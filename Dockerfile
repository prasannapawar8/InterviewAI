FROM node:20-alpine AS deps
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
# The postinstall hook runs `prisma generate`, which needs the schema.
COPY server/prisma ./prisma
# Keep the prisma CLI (the only devDependency): the container runs `prisma db push` on start.
RUN npm install

FROM node:20-alpine
# Prisma's query engine needs OpenSSL, which the Alpine base image does not ship.
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY server/package.json ./
COPY server/prisma ./prisma
COPY server/src ./src
RUN npx prisma generate
EXPOSE 4000
CMD ["node", "src/index.js"]
