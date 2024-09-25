FROM node:18
RUN ls 
WORKDIR /app
RUN ls
COPY package*.json ./
RUN ls -la /app
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

