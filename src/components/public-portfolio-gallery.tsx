import Image from "next/image";

export type PublicPortfolio = {
  userId: string;
  name: string;
  discipline: string | null;
  chapter: string | null;
  media: { id: string; url: string; type: "image" | "video" }[];
};

export default function PublicPortfolioGallery({ portfolios }: { portfolios: PublicPortfolio[] }) {
  return (
    <section className="public-portfolio-section">
      <div className="public-portfolio-heading">
        <span className="section-number">THE CREATIVE CIRCLE</span>
        <h2>Made by <em>our members.</em></h2>
        <p>Explore creative work shared by active NEC Naija members.</p>
      </div>
      {portfolios.length === 0
        ? <p className="public-portfolio-empty">Member portfolios will appear here as members share their work.</p>
        : <div className="public-portfolio-grid">{portfolios.map((portfolio) => (
          <article className="public-portfolio-card" key={portfolio.userId}>
            <div className="public-portfolio-media">
              {portfolio.media.map((item) => item.type === "video"
                ? <video key={item.id} src={item.url} controls preload="metadata" />
                : <Image key={item.id} src={item.url} alt={`${portfolio.name}'s portfolio`} width={480} height={360} unoptimized />)}
            </div>
            <div className="public-portfolio-meta">
              <h3>{portfolio.name}</h3>
              <p>{[portfolio.discipline, portfolio.chapter].filter(Boolean).join(" · ")}</p>
            </div>
          </article>
        ))}</div>}
    </section>
  );
}
