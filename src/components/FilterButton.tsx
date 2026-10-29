import { Icon } from './ui';

export default function FilterButton({
  activeCount,
  expanded,
  onClick,
  label = 'Filter',
  ariaLabel = 'Open filters',
}: {
  activeCount: number;
  expanded: boolean;
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      className={`relative inline-flex h-10 items-center gap-1.5 rounded-full border px-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:px-3 ${
        activeCount
          ? 'border-secondary bg-secondary-fixed text-secondary'
          : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low'
      }`}
    >
      <Icon name="filter_list" className="!text-[18px]" />
      <span className="hidden sm:inline">{label}</span>
      {activeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-bold leading-none text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}
