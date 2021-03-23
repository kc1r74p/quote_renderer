FROM node:current
WORKDIR /src
COPY ./src .
COPY ./*.json .
RUN npm ci
EXPOSE ${NODE_PORT}
CMD [ "node", "/src/index.js" ]