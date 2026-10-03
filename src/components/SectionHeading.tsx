import { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function SectionHeading({ eyebrow, title, description, children }: SectionHeadingProps) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <span className="mb-2 inline-block rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
          {eyebrow}
        </span>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 max-w-2xl text-base text-slate-400">{description}</p>}
      {children}
    </div>
  );
}
