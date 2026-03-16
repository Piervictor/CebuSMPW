import { Link } from 'react-router';
import { ChevronRight, Calendar } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string; // omit for the current (last) crumb
}

interface Props {
  items: BreadcrumbItem[];
}

export function SchedulingBreadcrumb({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] flex-wrap">
      <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#4F6BED' }} />
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronRight className="h-3 w-3 flex-shrink-0" style={{ color: '#D1D5DB' }} />
            )}
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="font-medium hover:underline transition-colors"
                style={{ color: '#4F6BED' }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? 'font-semibold' : 'font-medium'}
                style={{ color: isLast ? '#1F2937' : '#6B7280' }}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
