export function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search',
  children,
  actions
}) {
  return (
    <div className="action-row filter-bar">
      {typeof onSearchChange === 'function' && (
        <input
          type="search"
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      )}
      {children}
      {actions}
    </div>
  );
}

export default FilterBar;
