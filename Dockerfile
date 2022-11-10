FROM node:18-alpine

ENV BIND_ADDR=0.0.0.0
ENV PORT=3000
EXPOSE 3000

WORKDIR /app
RUN mkdir /app/logs
RUN mkdir /app/opendata

COPY package.json .
COPY package-lock.json .
RUN npm ci

COPY . .

CMD ["index.js"]
