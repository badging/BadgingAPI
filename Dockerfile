FROM node:latest

WORKDIR /usr/src/app

COPY . .

ENV PORT=2020
ENV CLIENT_ID=a3dc5431170ba9ae3adc
ENV CLIENT_SECRET=00b079f3e651deb7d103e30bb4b0f47bea4c1776
ENV REDIRECT_URI=http://localhost:2020/api/auth/github/callback
# MAIL_PASSWORD=cpwyqmlyytwfvqzg

# Expose the necessary port
EXPOSE 2020

# Specify the command to start the application
CMD [ "node", "index.js" ]
