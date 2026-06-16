FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

ENV DATA_DIR=/data
ENV PORT=3001

EXPOSE 3001

CMD ["bun", "run", "start"]
