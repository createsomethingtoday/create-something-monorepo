FROM docker.io/cloudflare/sandbox:0.7.0

ENV NODE_VERSION=22.13.1

RUN apt-get update && apt-get install -y xz-utils ca-certificates \
    && curl -fsSLk https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz -o /tmp/node.tar.xz \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && rm /tmp/node.tar.xz \
    && node --version \
    && npm --version

WORKDIR /app
COPY runtime/ /app/

ENV NODE_ENV=production
ENV PORT=8788

EXPOSE 8788

CMD ["/bin/sh", "-lc", "tail -f /dev/null"]
