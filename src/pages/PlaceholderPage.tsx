interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{description}</p>
      </header>
      <section className="panel">
        <p className="text-muted">This surface is planned for a later PR in the current stack.</p>
      </section>
    </div>
  );
}

