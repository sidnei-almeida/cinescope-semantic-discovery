import { TMDB_IMAGE_BASE, THUMB_SIZE } from "../../config/constants.js";

export default function CastMember({ member }) {
  const profilePath = member.profilePath ?? member.profile_path;
  const src = profilePath ? `${TMDB_IMAGE_BASE}/${THUMB_SIZE}${profilePath}` : null;
  const name = member.name ?? "Unknown";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="cast-member" title={name}>
      {src ? (
        <img className="cast-avatar" src={src} alt={name} loading="lazy" />
      ) : (
        <span className="cast-avatar cast-avatar--fallback" aria-hidden>
          {initial}
        </span>
      )}
      <span className="cast-name">{name}</span>
    </div>
  );
}
