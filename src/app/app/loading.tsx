/** Skeleton genérico das telas do app enquanto os dados carregam. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="skeleton h-9 w-56" />
      <div className="skeleton h-5 w-72 mt-3" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mt-8">
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
      </div>
      <div className="skeleton h-64 mt-8" />
    </div>
  );
}
