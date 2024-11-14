FROM node:18

# Install tzdata to set the timezone
RUN apt-get update && apt-get install -y tzdata

# Set the timezone to Guadalajara, Mexico
ENV TZ=America/Mexico_City
RUN ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && dpkg-reconfigure -f noninteractive tzdata

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG NEXT_PUBLIC_FRONTEND_URLS=http://localhost:3000
ENV NEXT_PUBLIC_FRONTEND_URLS=$NEXT_PUBLIC_FRONTEND_URLS
EXPOSE 5000
CMD ["node", "server.js"]
