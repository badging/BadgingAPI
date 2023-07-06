FROM node:latest
WORKDIR /usr/src/app
COPY package.json .
COPY . .
RUN npm install
EXPOSE 2020
CMD [ "node", "index.js" ]
