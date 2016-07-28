FROM node:6

RUN apt-get update && apt-get upgrade -y

ADD package.json /tmp/app/package.json
RUN cd /tmp/app && npm install --production
RUN mkdir -p /opt/app && cp -a /tmp/app/node_modules /opt/app

WORKDIR /opt/app
ADD . /opt/app

EXPOSE 3000

CMD npm start
