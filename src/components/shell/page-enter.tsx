/** Page enter: fade + 8px rise (CSS, so server HTML is visible before hydration). */
export function PageEnter({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
