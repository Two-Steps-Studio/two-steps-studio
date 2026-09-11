FROM node:20-bookworm-slim

# @napi-rs/canvas renders images fine without this (drawImage doesn't need
# it), but text rendering (fillText/measureText) goes through fontconfig on
# Linux to resolve font families -- "-slim" strips fontconfig out to save
# space, so GlobalFonts.registerFromPath()/ctx.font never actually find a
# usable font and every fillText call silently draws nothing. Profile cards
# came out with backgrounds/avatars/badges but zero text.
RUN apt-get update && apt-get install -y --no-install-recommends fontconfig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

CMD ["node", "index.js"]
