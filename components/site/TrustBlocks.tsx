import type { ReactNode } from "react";
import { joinProjects } from "@/lib/city-context";
import { getCallbackPromise } from "@/lib/callback";

type TrustBlocksProps = {
  /** Проекты каталога — те же, что в фактах под оффером (п. 6). */
  projects: string[];
};

/**
 * Три блока доверия (п. 59): «кто мы», «что нужно, чтобы начать», «что
 * будет после отклика». Визуал — по макету, согласованному 04.09
 * (Artifact «Блоки доверия — Работа Рядом»): иконки-чипы у заголовков,
 * чекмарки вместо точек в списке требований, пронумерованный таймлайн
 * с соединяющей линией.
 *
 * Разбор 04.09: на сайте не было ни слова «как это работает», «о нас»
 * или «оформление» — ни на главной, ни на детальной, ни в подвале, где
 * стоят только ФИО физлица и ИНН. При отклике в одно поле (п. 7) и
 * 1–2 лидах в неделю дело не в форме: человек не отдаёт номер
 * незнакомцу, и в этой нише не зря — рынок курьерских «подборов»
 * переполнен посредниками, перепродающими контакты.
 *
 * Блоков в исходной постановке четыре: четвёртый («платить не нужно ни
 * за что») и полная версия первого (кто именно работодатель — самозанятость
 * или трудовой договор) ждут подтверждения от владельца, см.
 * «Требует решения владельца» в docs/conversion-backlog.md. Эти три
 * написаны из того, что уже верно для всего каталога, без обещаний,
 * которые нечем подтвердить.
 */
export function TrustBlocks({ projects }: TrustBlocksProps) {
  return (
    <section aria-label="Как мы работаем">
      <p className="eyebrow">Прежде чем звонить</p>
      <h2 className="trust-blocks__heading">Как это устроено</h2>

      <div className="trust-blocks">
        <article className="detail-section trust-block">
          <div className="trust-block__head">
            <TrustIcon>
              <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              <path d="M16 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              <path d="M2 20c0-3.3 2.7-6 6-6h0c1.4 0 2.7.5 3.7 1.3" />
              <path d="M13.3 15.3C14.3 14.5 15.6 14 17 14h0c3.3 0 6 2.7 6 6" />
              <path d="m9 16 2 2 4-4" />
            </TrustIcon>
            <h3>Кто мы</h3>
          </div>
          <div className="text-block">
            <p className="text-block__para">
              Мы подбираем курьеров и сборщиков заказов для партнёров:{" "}
              {joinProjects(projects)}. Оформление проходит в
              компании-партнёре — мы сопровождаем кандидата до выхода на
              первую смену.
            </p>
            <p className="text-block__para">
              Отклик видят рекрутёры нашей компании. Мы не передаём
              контакты третьим лицам и не рассылаем сообщения.
            </p>
          </div>
        </article>

        <article className="detail-section trust-block">
          <div className="trust-block__head">
            <TrustIcon>
              <path d="M9 11 11 13l4-4" />
              <rect x="3" y="4" width="18" height="17" rx="3" />
            </TrustIcon>
            <h3>Что нужно, чтобы начать</h3>
          </div>
          <div className="text-block">
            {/* Возраст и смартфон — единственные требования, верные для всех
                169 вакансий (проверено запросом к базе, тот же принцип,
                что у фактов под оффером — п. 6). Остальное различается по
                проекту, и до подтверждения условий по каждому партнёру
                обещать общий ответ нельзя — см. п. 9. */}
            <ul className="trust-checklist">
              <li>От 18 лет</li>
              <li>Смартфон на базе Android</li>
            </ul>
            <p className="text-block__para">
              Требования по медицинской книжке, гражданству или патенту и
              по технике — индивидуальны для каждого проекта. Полный
              перечень указан в описании вакансии.
            </p>
          </div>
        </article>

        <article className="detail-section trust-block">
          <div className="trust-block__head">
            <TrustIcon>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </TrustIcon>
            <h3>Что будет после отклика</h3>
          </div>
          <ol className="trust-timeline">
            <li>{getCallbackPromise()}</li>
            <li>Оформление документов и первая смена — как правило, на следующий день</li>
            <li>Выплаты — каждую неделю</li>
          </ol>
        </article>
      </div>
    </section>
  );
}

function TrustIcon({ children }: { children: ReactNode }) {
  return (
    <span className="trust-block__icon" aria-hidden="true">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}
