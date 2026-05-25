FROM alpine:3.20 AS downloader
ARG PB_VERSION=0.38.1
ARG TARGETARCH

RUN apk add --no-cache wget unzip ca-certificates

RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
    -O /tmp/pocketbase.zip \
    && unzip /tmp/pocketbase.zip -d /tmp/pocketbase \
    && rm /tmp/pocketbase.zip

FROM alpine:3.20
RUN apk add --no-cache ca-certificates

COPY --from=downloader /tmp/pocketbase/pocketbase /usr/local/bin/pocketbase
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

EXPOSE 8090

CMD ["pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks"]
