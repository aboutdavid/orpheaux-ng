docker build --pull --rm -f "Dockerfile" -t aboutdavid/orpheaux-ng:latest "." 
docker compose down
docker compose up -d