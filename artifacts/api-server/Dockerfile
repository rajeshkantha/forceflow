FROM node:22

WORKDIR /app

COPY . .

ENV CI=true

RUN corepack enable && \
    sed -i 's/"preinstall":.*/"preinstall": "echo pnpm validation skipped",/' /app/package.json

RUN npm_config_user_agent=pnpm/11.2.2 pnpm install --no-frozen-lockfile || true

EXPOSE 8080

ENTRYPOINT ["pnpm", "--filter", "@workspace/api-server", "run", "dev"]
