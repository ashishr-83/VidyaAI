FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        curl \
        ca-certificates \
        build-essential \
        openssl \
        postgresql-client \
        redis-tools \
        docker.io \
        docker-compose-v2 \
        fuse-overlayfs \
        iptables \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /etc/docker \
    && printf '{\n  "storage-driver": "fuse-overlayfs"\n}\n' > /etc/docker/daemon.json

# Allow the ubuntu user to run Docker without sudo after image build.
RUN groupadd -f docker && usermod -aG docker node || true

USER node
