# Use the official Node.js 20 image as a parent image
FROM node:20.17
 
# Set the working directory
WORKDIR /usr/src/app
 
# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./
COPY yarn.lock ./
 
# Install dependencies
RUN npm install --production
 
# Copy the rest of your application code
COPY . .
 
# Use a custom ESLint configuration
COPY .eslintrc.js .eslintrc.js

ARG NEXT_PUBLIC_API_URL=http://localhost:5001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build your Next.js application
RUN npm run build
 
# Expose the port the app runs on
EXPOSE 3000

# Command to run your app
CMD ["npm", "start"]