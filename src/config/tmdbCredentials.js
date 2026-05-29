/**
 * Credenciais TMDb do CineScope (mesmas do projeto legado em tmdb-cinema/tmdb-config.js).
 * O visitante não precisa configurar nada — a busca e o enriquecimento funcionam out of the box.
 * Variáveis VITE_* no .env só sobrescrevem se você quiser testar outra chave localmente.
 */

const PROJECT_TMDB_API_KEY = "627d73f07c70400ac8971131c5f79c22";
const PROJECT_TMDB_READ_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2MjdkNzNmMDdjNzA0MDBhYzg5NzExMzFjNWY3OWMyMiIsIm5iZiI6MTc2MzA3Nzg5OC44ODk5OTk5LCJzdWIiOiI2OTE2NmYwYTc2M2I1MDk3ZGRhYzI3M2MiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.11pkeWBSssL-YKhzakT-f9sZFYXPsfu3l6Rnth3hmZ0";

export const TMDB_API_KEY =
  import.meta.env.VITE_TMDB_API_KEY || PROJECT_TMDB_API_KEY;

export const TMDB_READ_TOKEN =
  import.meta.env.VITE_TMDB_READ_TOKEN || PROJECT_TMDB_READ_TOKEN;

export function hasTmdbCredentials() {
  return Boolean(TMDB_API_KEY || TMDB_READ_TOKEN);
}
