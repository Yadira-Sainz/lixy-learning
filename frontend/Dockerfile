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

# Stage 2: Production
FROM node:20.17

RUN apt-get update && apt-get install -y tzdata
ENV TZ=America/Mexico_City
RUN ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && dpkg-reconfigure -f noninteractive tzdata

WORKDIR /usr/src/app

# Copy only what's needed for production
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/yarn.lock ./
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/next.config.mjs ./

EXPOSE 3000

CMD ["npm", "start"]
