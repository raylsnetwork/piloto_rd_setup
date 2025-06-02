FROM ghcr.io/foundry-rs/foundry:latest

USER root

# Instala Node.js 18, npm e Hardhat globalmente
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g hardhat && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências primeiro
COPY package*.json ./
RUN npm install

# Copia o projeto inteiro
COPY . .

# Cria pastas de saída utilizadas por Hardhat e plugins
RUN mkdir -p \
    /app/cache \
    /app/artifacts \
    /app/cache_hardhat \
    /app/typechain-types \
    /app/bindings \
    /app/.openzeppelin && \
    chown -R foundry:foundry \
    /app/cache \
    /app/artifacts \
    /app/cache_hardhat \
    /app/typechain-types \
    /app/bindings \
    /app/.openzeppelin

# Copia entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER foundry

CMD ["entrypoint.sh"]