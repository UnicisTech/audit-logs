# Use node image as base
FROM node:latest

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port 3000 for the application
EXPOSE 3000

# Define common variables
ARG LOG_LEVEL
ENV POSTGRES_HOST=postgres \
    HMAC_SECRET_ADMIN=xxxxxxx \
    NSQD_HTTP_PORT=4151 \
    SHLVL=1 \
    POSTGRES_USER=retraced \
    EXPORT_PAGE_SIZE_INTERNAL=2 \
    POSTGRES_PASSWORD=password \
    POSTGRES_POOL_SIZE=10 \
    HMAC_SECRET_VIEWER=xxxxxxxxx \
    POSTGRES_PORT=5432 \
    API_BASE_URL_PATH=/auditlog \
    RETRACED_API_BASE=http://localhost:3000/auditlog \
    POSTGRES_DATABASE=retraced \
    LOG_LEVEL=${LOG_LEVEL} \
    ELASTICSEARCH_NODES=http://elasticsearch:9200 \
    NSQD_HOST=nsqd \
    HOSTNAME=retraced-api-67856674bf-kwq7f \
    NSQD_TCP_PORT=4150 \
    ADMIN_ROOT_TOKEN=dev \
    GEOIPUPDATE_LICENSE_KEY=${GEOIPUPDATE_LICENSE_KEY} \
    GEOIPUPDATE_DB_DIR=${GEOIPUPDATE_DB_DIR:-/etc/mmdb} \
    GEOIPUPDATE_USE_MMDB=${GEOIPUPDATE_USE_MMDB} \
    GEOIPUPDATE_ACCOUNT_ID=${GEOIPUPDATE_ACCOUNT_ID} \
    PG_SEARCH=${PG_SEARCH}

# Build arguments
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

# Build arguments
ARG GEOIPUPDATE_LICENSE_KEY
ENV GEOIPUPDATE_LICENSE_KEY=${GEOIPUPDATE_LICENSE_KEY}

# Build arguments
ARG GEOIPUPDATE_DB_DIR
ENV GEOIPUPDATE_DB_DIR=${GEOIPUPDATE_DB_DIR}

# Build arguments
ARG GEOIPUPDATE_USE_MMDB
ENV GEOIPUPDATE_USE_MMDB=${GEOIPUPDATE_USE_MMDB}

# Build arguments
ARG GEOIPUPDATE_ACCOUNT_ID
ENV GEOIPUPDATE_ACCOUNT_ID=${GEOIPUPDATE_ACCOUNT_ID}

# Build arguments
ARG PG_SEARCH
ENV PG_SEARCH=${PG_SEARCH}

# Build arguments
ARG STATSD_HOST
ENV STATSD_HOST=${STATSD_HOST}

# Build arguments
ARG STATSD_PORT
ENV STATSD_PORT=${STATSD_PORT}

# Command to run the application
CMD ["node", "--inspect=0.0.0.0", "--enable-source-maps", "build/src/index.js"]
