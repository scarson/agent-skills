# Dockerfile for the Python load-analytics service.
# Eval fixture for the performance-audit skill (illustrative; NOT a live workflow —
# lives under test-fixtures/). Answer key in expected-findings.md — assessor-only;
# do not read it when auditing this fixture.

FROM python:3.12

WORKDIR /app

COPY . .

RUN apt-get update && apt-get install -y build-essential \
 && pip install --no-cache-dir -r requirements.txt

CMD ["python", "-m", "analytics.serve"]
