FROM rust:1.78.0-alpine as builder

WORKDIR /app

RUN apk add musl-dev

# set up empty project to compile dependencies
RUN USER=root cargo init --name geojson-export

COPY Cargo.toml Cargo.lock .

RUN cargo build --release && rm target/release/geojson-export
RUN rm target/release/deps/geojson_export*

# copy actual code over

COPY src ./src

RUN cargo build --release
# this avoids having to build all dependencies in debug mode again
# RUN cargo test --release

FROM scratch

COPY --from=builder /app/target/release/geojson-export /

CMD ["/geojson-export"]
