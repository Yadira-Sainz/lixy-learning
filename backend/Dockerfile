FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG NEXT_PUBLIC_FRONTEND=http://localhost:3000
ENV NEXT_PUBLIC_FRONTEND=$NEXT_PUBLIC_FRONTEND
EXPOSE 5000
CMD ["node", "server.js"]
