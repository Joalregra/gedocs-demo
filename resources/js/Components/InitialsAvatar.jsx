// Local avatar made of the person's initials. Replaces an external avatar service so no name
// is ever sent to a third party. The background comes from a fixed brand palette (all pass AA with white text).
const COLORS = ["#23395B", "#2F6F73", "#5B3E96", "#4A5568", "#8A4B2B"];

const initialsOf = (name) => {
    const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
};

const colorOf = (name) => {
    let hash = 0;
    for (const char of String(name ?? "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return COLORS[hash % COLORS.length];
};

export default function InitialsAvatar({ name, className = "" }) {
    return (
        <div
            role="img"
            aria-label={`Iniciales de ${name || "usuario"}`}
            style={{ backgroundColor: colorOf(name) }}
            className={`flex select-none items-center justify-center font-semibold text-white ${className}`}
        >
            {initialsOf(name)}
        </div>
    );
}
