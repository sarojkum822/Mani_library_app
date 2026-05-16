/** Leaf route segment under `(admin)` → compact top bar title. */
export function adminScreenTitle(leaf: string | undefined): string | null {
  switch (leaf) {
    case undefined:
    case 'index':
      return 'Overview';
    case 'members':
      return 'Members';
    case 'member':
      return 'Member';
    case 'payments':
      return 'Payments';
    case 'attendance':
      return 'Attendance';
    case 'subscriptions':
      return 'Subscriptions';
    case 'docs':
      return 'Documents';
    case 'settings':
      return 'Settings';
    case 'search':
      return 'Search';
    default:
      return null;
  }
}
