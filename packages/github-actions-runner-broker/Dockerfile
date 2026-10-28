FROM ubuntu:24.04

ARG RUNNER_VERSION=2.338.1
ARG RUNNER_SHA256=08e9ccb3604d2462c24b5e33604dc30810296ca15cc65f23cffd4317eb144c37

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git jq sudo tar unzip \
  && useradd --create-home --shell /bin/bash runner \
  && echo 'runner ALL=(ALL) NOPASSWD:ALL' >/etc/sudoers.d/runner \
  && chmod 0440 /etc/sudoers.d/runner \
  && mkdir -p /runner \
  && curl --fail --location --silent --show-error \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" \
    --output /tmp/actions-runner.tar.gz \
  && echo "${RUNNER_SHA256}  /tmp/actions-runner.tar.gz" | sha256sum --check - \
  && tar --extract --gzip --file /tmp/actions-runner.tar.gz --directory /runner \
  && /runner/bin/installdependencies.sh \
  && rm -rf /var/lib/apt/lists/* /tmp/actions-runner.tar.gz

COPY entrypoint.sh /runner/entrypoint.sh
RUN chmod 0755 /runner/entrypoint.sh && chown -R runner:runner /runner

USER runner
WORKDIR /runner
ENTRYPOINT ["/bin/bash", "/runner/entrypoint.sh"]
