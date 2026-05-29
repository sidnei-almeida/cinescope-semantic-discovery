# cinescope-semantic-discovery

Cinematic semantic movie discovery interface powered by BERT vector search and TMDb metadata.

## Setup

```bash
npm install
npm run dev
# Opcional: cp .env.example .env — só se quiser mudar URL do recommender
```

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_RECOMMENDER_API_URL` | **Obrigatória em produção** — URL do semantic recommender (ex.: Render). **Dev:** vazio = proxy Vite `/recommender` |
| `VITE_RECOMMENDER_DIRECT` | `true` para chamar Render direto no dev (não recomendado) |
| `VITE_TMDB_API_KEY` | Recomendada — posters, cast, trailers, metadata. Sem ela, o app usa fallbacks visuais |
| `VITE_TMDB_READ_TOKEN` | Opcional — Bearer token TMDb |
| `VITE_TMDB_IMAGE_BASE_URL` | CDN de imagens (default: `https://image.tmdb.org/t/p`) |

A chave TMDb do CineScope também está embutida em `src/config/tmdbCredentials.js` para demos locais.

### Fluxo de dados

1. **Recommender** (`POST /api/v1/recommend`) — só `synopsis`, `genre`, `year`, `title`, `top_k`
2. Resposta básica — `movie_id`, `similarity_score`, `title`, `overview`
3. **TMDb** — enriquecimento por `movie_id` (details, credits, videos)
4. **Front** — ranking híbrido e UI

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview production build

## Legacy reference

The original vanilla JS implementation lives in `tmdb-cinema/` and was used as the source of truth for ranking, fallback, and TMDb integration logic migrated to `src/services/` and `src/utils/`.
