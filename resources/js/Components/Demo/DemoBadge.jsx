// Permanent, discreet notice shown in the header while the app runs as the public demo.
export default function DemoBadge() {
    return (
        <span
            className="hidden items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent md:inline-flex"
            title="Demo con datos ficticios. Los datos se reinician cada día a las 3:00 a. m. (hora de Colombia)."
        >
            Demo con datos ficticios. Se reinicia cada día a las 3:00 a. m.
        </span>
    );
}
