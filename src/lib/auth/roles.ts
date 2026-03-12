export function userRoles(role: string | undefined) {
  return {
    SuperUser: role === 'superuser',
    Admin: role === 'superuser' || role === 'administrator',
    Member: role === 'staff' || role === 'administrator' || role === 'superuser',
  };
}
