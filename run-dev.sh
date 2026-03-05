#/bin/sh

docker-compose up
cd client && npm run dev
cd server && npm run dev
