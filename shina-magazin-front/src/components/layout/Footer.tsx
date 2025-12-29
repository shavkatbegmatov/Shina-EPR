export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-base-200/70 bg-base-100/70 px-4 py-4 text-xs text-base-content/60 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="pill">ERP</span>
          <span>© {year} Shina Magazin. Barcha huquqlar himoyalangan.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="nav-chip">Qo'llab-quvvatlash</span>
          <span className="nav-chip">Yordam</span>
          <span className="nav-chip">v1.0</span>
        </div>
      </div>
    </footer>
  );
}
