type TechBadgeProps = {
  label: string;
};

export default function TechBadge({ label }: TechBadgeProps) {
  return (
    <span className="rounded-full border border-amber-900/15 bg-amber-100/70 px-2.5 py-1 text-xs font-medium text-amber-900">
      {label}
    </span>
  );
}
