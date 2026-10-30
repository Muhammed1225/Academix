import { Icon } from './ui';

export default function FilterButton({
  activeCount,
  expanded,
  onClick,
  label = 'Filter',
  ariaLabel = 'Open filters',
  compact = false,
}: {
  activeCount: number;
  expanded: boolean;
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      className={`relative inline-flex items-center rounded-full border font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
        compact ? 'h-9 gap-1 px-1.5 text-xs sm:px-2' : 'h-10 gap-1.5 px-2 text-sm sm:px-3'
      } ${
        activeCount
          ? 'border-secondary bg-secondary-fixed text-secondary'
          : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low'
      }`}
    >
      <Icon name="filter_list" className={compact ? '!text-[16px]' : '!text-[18px]'} />
      <span className="hidden sm:inline">{label}</span>
      {activeCount > 0 && (
        <span className={`flex items-center justify-center rounded-full bg-secondary px-1 font-bold leading-none text-white ${compact ? 'h-4 min-w-4 text-[10px]' : 'h-5 min-w-5 text-[11px]'}`}>
          {activeCount}
        </span>
      )}
    </button>
  );
}
