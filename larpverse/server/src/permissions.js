// Staff permissions checked server-side by every admin endpoint.
export const PERMISSIONS = {
  'admin.access': 'Open the Modify Menu',
  'accounts.view': 'Search and view accounts',
  'accounts.manage': 'Create, edit, enable/disable and switch into fictional accounts',
  'currency.manage': 'Set, add and remove fictional currency; scripted transactions',
  'badges.manage': 'Create badges and assign or remove them',
  'inventory.manage': 'Grant and revoke items, reset purchases',
  'catalog.manage': 'Create and edit marketplace items',
  'social.manage': 'Configure followers, following, friendships and staged statistics',
  'avatar.manage': 'Modify any account avatar and outfits',
  'experiences.manage': 'Create and edit experiences',
  'game.manage': 'Manage LARP sessions, roles and scenarios',
  'events.manage': 'Create and trigger scripted events',
  'presets.manage': 'Create, import, export and load scenario presets',
  'notifications.manage': 'Send scripted notifications',
  'config.manage': 'Edit economy and platform configuration',
  'audit.view': 'View the audit log',
  'staff.manage': 'Create staff logins and change staff roles/permissions',
};

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS);

export const ROLE_DEFAULTS = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter((p) => p !== 'staff.manage'),
  moderator: ['admin.access', 'accounts.view', 'game.manage', 'audit.view', 'notifications.manage'],
  user: [],
};

export const STAFF_RANK = { user: 0, moderator: 1, admin: 2, owner: 3 };

export function seedRolePermissions(db) {
  for (const [role, perms] of Object.entries(ROLE_DEFAULTS)) {
    for (const p of perms) db.run('INSERT OR IGNORE INTO role_permissions (staff_role, permission) VALUES (?, ?)', role, p);
  }
}

export function permissionsFor(db, user) {
  if (!user || user.status !== 'active') return new Set();
  const set = new Set(db.all('SELECT permission FROM role_permissions WHERE staff_role = ?', user.staff_role).map((r) => r.permission));
  for (const o of db.all('SELECT permission, granted FROM user_permission_overrides WHERE user_id = ?', user.id)) {
    if (o.granted) set.add(o.permission); else set.delete(o.permission);
  }
  if (user.staff_role === 'owner') for (const p of ALL_PERMISSIONS) set.add(p);
  return set;
}
