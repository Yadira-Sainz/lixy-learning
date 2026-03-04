# Stage 1: Build
FROM node:20.17 AS builder

RUN apt-get update && apt-get install -y tzdata
ENV TZ=America/Mexico_City
RUN ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && dpkg-reconfigure -f noninteractive tzdata

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./
RUN npm install

COPY . .
COPY .eslintrc.js .eslintrc.js

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

RUN npm run build

# Stage 2: Production (standalone output)
FROM node:20.17

RUN apt-get update && apt-get install -y tzdata
ENV TZ=America/Mexico_City
RUN ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && dpkg-reconfigure -f noninteractive tzdata

WORKDIR /usr/src/app

# Standalone: copia solo lo necesario (server.js + .next mínimo)
COPY --from=builder /usr/src/app/.next/standalone ./
COPY --from=builder /usr/src/app/.next/static ./.next/static

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["node", "server.js"]
