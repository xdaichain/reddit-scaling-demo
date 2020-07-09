FROM node:8-alpine

WORKDIR /demo

COPY contracts ./contracts
COPY scripts ./scripts
COPY package*.json ./

RUN npm i

CMD ["npm","run","load","--","--help"]
