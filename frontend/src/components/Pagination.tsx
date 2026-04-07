interface PaginationProps {
  page: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalCount,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  // Build the page number list with ellipses
  const WINDOW = 2; // pages on each side of current
  const pages: (number | 'ellipsis')[] = [];

  const addPage = (p: number) => {
    if (pages[pages.length - 1] !== p) pages.push(p);
  };
  const addEllipsis = () => {
    if (pages[pages.length - 1] !== 'ellipsis') pages.push('ellipsis');
  };

  addPage(1);
  if (page - WINDOW > 2) addEllipsis();
  for (let p = Math.max(2, page - WINDOW); p <= Math.min(totalPages - 1, page + WINDOW); p++) {
    addPage(p);
  }
  if (page + WINDOW < totalPages - 1) addEllipsis();
  if (totalPages > 1) addPage(totalPages);

  return (
    <nav aria-label="Pagination">
      <ul className="pagination justify-content-center flex-wrap">
        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(1)} disabled={page === 1} aria-label="First">
            «
          </button>
        </li>
        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous">
            ‹
          </button>
        </li>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <li key={`ellipsis-${i}`} className="page-item disabled">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(p)}>
                {p}
              </button>
            </li>
          )
        )}

        <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Next">
            ›
          </button>
        </li>
        <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(totalPages)} disabled={page === totalPages} aria-label="Last">
            »
          </button>
        </li>
      </ul>
    </nav>
  );
}
