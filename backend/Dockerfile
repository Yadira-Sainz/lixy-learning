FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG FRONTEND_URL=http://localhost:3000
ENV FRONTEND_URL=$FRONTEND_URL
EXPOSE 5000
CMD ["node", "server.js"]
