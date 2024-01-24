FROM node:19
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 2020
CMD [ "npm", "start" ]
