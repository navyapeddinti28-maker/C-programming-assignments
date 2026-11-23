import {
  CheckCircle2,
  Clock,
  XCircle,
  PackageCheck,
  Search,
  Laptop,
  CreditCard,
  BookOpen,
  Briefcase,
  Watch,
  Droplets,
  KeyRound,
  Package,
} from 'lucide-react';

export function StatusLabel({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'available' || s === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }
  if (s === 'approved' || s === 'matched' || s === 'claimed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
        <PackageCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }
  if (s === 'returned' || s === 'completed' || s === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }
  if (s === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function CategoryIcon({
  category,
  className = 'w-5 h-5 text-[#0F294A]',
}: {
  category: string;
  className?: string;
}) {
  switch (category) {
    case 'Electronics':
      return <Laptop className={className} aria-hidden="true" />;
    case 'ID Cards':
      return <CreditCard className={className} aria-hidden="true" />;
    case 'Books and Notes':
      return <BookOpen className={className} aria-hidden="true" />;
    case 'Bags':
      return <Briefcase className={className} aria-hidden="true" />;
    case 'Accessories':
      return <Watch className={className} aria-hidden="true" />;
    case 'Water Bottles':
      return <Droplets className={className} aria-hidden="true" />;
    case 'Keys':
      return <KeyRound className={className} aria-hidden="true" />;
    case 'Search':
      return <Search className={className} aria-hidden="true" />;
    default:
      return <Package className={className} aria-hidden="true" />;
  }
}
