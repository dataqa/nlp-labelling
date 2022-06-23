FROM python:3 AS django
ENV PYTHONUNBUFFERED=1

RUN apt update && \
    apt install -y xmlsec1
RUN pip install poetry

WORKDIR /app
ADD ./poetry.lock /app/poetry.lock
ADD ./pyproject.toml /app/pyproject.toml
RUN poetry install --no-dev

COPY root /app/root

RUN mkdir -p /storage

EXPOSE 9000

# define the default command to run when starting the container
# --bind <PORT> should match port in AWS Target Group
CMD ["poetry", "run", "gunicorn", "--chdir", "root", "--bind", ":80", "--workers", "5", "--threads", "4", "dataqa.wsgi:application"]
