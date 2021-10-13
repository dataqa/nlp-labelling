FROM ubuntu:hirsute-20210917

ENV DEBIAN_FRONTEND=noninteractive
EXPOSE 5000
RUN apt --yes update
RUN apt --yes install python3-pip
RUN pip3 install -U pip
RUN pip install dataqa --use-deprecated=legacy-resolver
RUN mkdir /usr/local/lib/python3.9/dist-packages/dataqa_es/server/elasticsearch-7.9.2/plugins
RUN pip install /usr/local/lib/python3.9/dist-packages/dataqa/nlp/en_core_web_sm-2.3.1.tar.gz

RUN useradd -p $(openssl passwd -crypt appuser) appuser
RUN mkdir /home/appuser
RUN chown appuser /home/appuser

CMD ["su", "-", "appuser", "-c", "dataqa run"]