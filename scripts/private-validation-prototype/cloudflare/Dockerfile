FROM node@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS node24
FROM docker.io/cloudflare/sandbox@sha256:35c932d3e5b35f28d350800cf00551cac46dfe28274afb54e16325b8d8f560d1
COPY --from=node24 /usr/local/bin/node /usr/local/bin/node
COPY probe.mjs /opt/private-probe.mjs
