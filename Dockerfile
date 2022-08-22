FROM node:16
LABEL org.opencontainers.image.source="https://github.com/kc1r74p/quote_renderer"
WORKDIR /src
COPY ./src .
COPY ./*.json .
RUN npm i
EXPOSE ${NODE_PORT}
CMD [ "node", "/src/index.js" ]
