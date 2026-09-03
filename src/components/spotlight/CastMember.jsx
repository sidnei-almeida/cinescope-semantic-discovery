import { TMDB_IMAGE_BASE, THUMB_SIZE } from "../../config/constants.js";

export default function CastMember({ member }) {
  const profilePath = member.profilePath ?? member.profile_path;
  const src = profilePath ? `${TMDB_IMAGE_BASE}/${THUMB_SIZE}${profilePath}` : null;
  const name = member.name ?? "Unknown";
  const character = member.character ?? null;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="cast-member" title={character ? `${name} — ${character}` : name}>
      {src ? (
        <img className="cast-avatar" src={src} alt={name} loading="lazy" />
      ) : (
        <span className="cast-avatar cast-avatar--fallback" aria-hidden>
          {initial}
        </span>
      )}
      <span className="cast-text">
        <span className="cast-name">{name}</span>
        {/* Only rendered on wide layouts, where billing reads as a list. */}
        {character && <span className="cast-character">{character}</span>}
      </span>
    </div>
  );
}
