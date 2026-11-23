const widths = ["w-4/5", "w-3/5", "w-11/12", "w-2/3", "w-3/4", "w-1/2"];

export function SidebarSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1 pt-4">
      {widths.map((w) => (
        <div
          key={w}
          className={`mx-2 h-8 animate-pulse rounded-[0.65rem] bg-surface-2 ${w}`}
        />
      ))}
    </div>
  );
}
