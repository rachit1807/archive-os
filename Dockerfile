FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json package-lock.json server.js storage.js postgres.js auth.js lifecycle.js ./
RUN npm ci --omit=dev
COPY --chown=node:node public ./public
RUN mkdir data && chown node:node data
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
