import { Fragment } from "react";

type VacancyTextBlockProps = {
  title: string;
  text: string;
};

type Block =
  | { kind: "list"; items: string[] }
  | { kind: "subhead"; text: string }
  | { kind: "para"; text: string };

const BULLET = /^[•\-–—*]\s+(.*)$/;

// Подзаголовок — короткая строка-метка, заканчивающаяся двоеточием
// (без точки/воскл./вопрос. знаков в основной части). Напр. «Что предоставляем:».
function isSubhead(line: string): boolean {
  return (
    line.endsWith(":") && line.length <= 60 && !/[.!?]/.test(line.slice(0, -1))
  );
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let list: string[] | null = null;

  const flush = () => {
    if (list) {
      blocks.push({ kind: "list", items: list });
      list = null;
    }
  };

  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();

    if (!line) {
      flush();
      continue;
    }

    const bullet = line.match(BULLET);
    if (bullet) {
      (list ??= []).push(bullet[1]!.trim());
      continue;
    }

    flush();
    blocks.push(
      isSubhead(line)
        ? { kind: "subhead", text: line }
        : { kind: "para", text: line },
    );
  }

  flush();
  return blocks;
}

export function VacancyTextBlock({ title, text }: VacancyTextBlockProps) {
  const blocks = parseBlocks(text);

  return (
    <section className="detail-section">
      <h2>{title}</h2>
      <div className="text-block">
        {blocks.map((block, index) => (
          <Fragment key={index}>
            {block.kind === "list" ? (
              <ul className="text-block__list">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            ) : block.kind === "subhead" ? (
              <p className="text-block__subhead">{block.text}</p>
            ) : (
              <p className="text-block__para">{block.text}</p>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
