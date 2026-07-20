FROM rust:1.97-alpine as builder

WORKDIR /app

RUN apk add musl-dev ca-certificates-bundle

RUN USER=root cargo init --name sensor-transformer

COPY Cargo.toml Cargo.lock .

RUN cargo build --release && rm target/release/sensor-transformer
RUN rm target/release/deps/sensor_transformer*

COPY src ./src

RUN cargo build --release

FROM scratch

COPY --from=builder /app/target/release/sensor-transformer /
COPY --from=builder /etc/ssl/certs /etc/ssl/certs

EXPOSE 8088

CMD ["/sensor-transformer"]