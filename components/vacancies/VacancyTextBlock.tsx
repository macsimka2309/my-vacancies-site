type VacancyTextBlockProps = {
  title: string;
  text: string;
};

export function VacancyTextBlock({ title, text }: VacancyTextBlockProps) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section className="detail-section">
      <h2>{title}</h2>
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
