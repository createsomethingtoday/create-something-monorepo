FROM ubuntu:24.04

ARG RUNNER_VERSION=2.336.0
ARG RUNNER_SHA256=04cf0be1aff4c3ec3554466c39124ca250e3effd8873bb7e8d68535aa9505d5d

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
