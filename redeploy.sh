eval $(docker-machine env myvm1);
docker build -t nlowe31/mongo-zenko-dodo .;
docker push nlowe31/mongo-zenko-dodo;
docker stack deploy -c docker-stack.yml mzd;