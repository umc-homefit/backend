# syntax=docker/dockerfile:1

FROM node:22-alpine3.24 AS dependencies

WORKDIR /app

# Prisma의 Linux musl query engine이 필요로 하는 OpenSSL을 설치한다.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY prisma ./prisma
RUN npm run prisma:generate

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# devDependencies를 제거한 운영용 node_modules를 별도로 준비한다.
# build를 기준으로 prune해야 prisma generate로 생성된 Prisma Client(.prisma/client)가 유지된다.
# prisma CLI는 pre-deploy 단계의 `prisma migrate deploy` 실행을 위해 dependencies로 옮겨져 있어 prune 후에도 남는다.
FROM build AS prod-dependencies

RUN npm prune --omit=dev

FROM node:22-alpine3.24 AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=prod-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const http=require('http');const port=process.env.PORT||3000;const req=http.get({host:'127.0.0.1',port,path:'/api/health'},res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.setTimeout(3000,()=>{req.destroy();process.exit(1)})"

CMD ["npm", "run", "start:prod"]
