import { useOutletContext } from 'react-router-dom';

export function CompanyPlaceholderPage({ title }: { title: string }) {
  const ctx = useOutletContext<{ companyName?: string } | undefined>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-500">
        {ctx?.companyName ?? 'Company'} — this screen is coming soon (SRS).
      </p>
    </div>
  );
}
