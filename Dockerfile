FROM node:16

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