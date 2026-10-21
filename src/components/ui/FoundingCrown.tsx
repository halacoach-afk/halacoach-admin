import {Crown} from 'lucide-react';

const LABEL = 'Founding Member';

type FoundingCrownProps = {
  className?: string;
  /** Icon size class; default matches compact list/detail chips. */
  sizeClassName?: string;
};

/** Same Crown as Founding Members nav — use for founding coaches with native tooltip. */
export function FoundingCrown({
  className,
  sizeClassName = 'size-4',
}: FoundingCrownProps) {
  return (
    <span
      className={className ?? 'inline-flex shrink-0'}
      title={LABEL}
      aria-label={LABEL}>
      <Crown className={sizeClassName} strokeWidth={1.8} aria-hidden />
    </span>
  );
}
