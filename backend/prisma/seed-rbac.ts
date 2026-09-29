import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

export const SYSTEM_ROLES = [
  {
    code: 'ADMIN',
    name: 'Administrator',
    description:
      'Platform administrator with full administrative and moderation access.',
    isSystem: true,
    isActive: true,
    isAssignableOnRegistration: false,
  },
  {
    code: 'WORKER',
    name: 'Worker',
    description:
      'Freelancer / worker capable of discovering, applying for, and completing jobs.',
    isSystem: true,
    isActive: true,
    isAssignableOnRegistration: true,
  },
  {
    code: 'RECRUITER',
    name: 'Recruiter',
    description:
      'Employer / client capable of posting jobs, reviewing candidates, and hiring.',
    isSystem: true,
    isActive: true,
    isAssignableOnRegistration: true,
  },
];

export const BASELINE_PERMISSIONS = [
  // Module: users
  {
    code: 'users:read',
    name: 'View Users',
    module: 'users',
    description: 'View user profiles and account details.',
  },
  {
    code: 'users:update',
    name: 'Update Users',
    module: 'users',
    description: 'Update user account information and settings.',
  },
  {
    code: 'users:block',
    name: 'Block Users',
    module: 'users',
    description: 'Block user accounts from accessing the platform.',
  },
  {
    code: 'users:unblock',
    name: 'Unblock Users',
    module: 'users',
    description: 'Unblock previously blocked user accounts.',
  },

  // Module: jobs
  {
    code: 'jobs:create',
    name: 'Create Jobs',
    module: 'jobs',
    description: 'Create new job postings.',
  },
  {
    code: 'jobs:read',
    name: 'View Jobs',
    module: 'jobs',
    description: 'Browse and view available job listings.',
  },
  {
    code: 'jobs:update',
    name: 'Update Jobs',
    module: 'jobs',
    description: 'Modify details of existing job postings.',
  },
  {
    code: 'jobs:delete',
    name: 'Delete Jobs',
    module: 'jobs',
    description: 'Delete or cancel job postings.',
  },

  // Module: applications
  {
    code: 'applications:apply',
    name: 'Apply to Jobs',
    module: 'applications',
    description: 'Submit applications for open job listings.',
  },
  {
    code: 'applications:withdraw',
    name: 'Withdraw Applications',
    module: 'applications',
    description: 'Withdraw submitted job applications.',
  },
  {
    code: 'applications:accept',
    name: 'Accept Applications',
    module: 'applications',
    description: 'Accept candidate applications for posted jobs.',
  },

  // Module: reports
  {
    code: 'reports:read',
    name: 'View Reports',
    module: 'reports',
    description: 'Inspect user and job reports filed on the platform.',
  },
  {
    code: 'reports:resolve',
    name: 'Resolve Reports',
    module: 'reports',
    description: 'Resolve and take administrative action on filed reports.',
  },

  // Module: roles (RBAC management - RESERVED/FUTURE)
  {
    code: 'roles:read',
    name: 'View Roles',
    module: 'roles',
    description: 'View RBAC roles and assigned permissions.',
  },
  {
    code: 'roles:assign',
    name: 'Assign Roles',
    module: 'roles',
    description: '[RESERVED/FUTURE] Assign RBAC roles to users.',
  },
  {
    code: 'roles:revoke',
    name: 'Revoke Roles',
    module: 'roles',
    description: '[RESERVED/FUTURE] Revoke RBAC roles from users.',
  },
  {
    code: 'roles:manage',
    name: 'Manage Roles',
    module: 'roles',
    description:
      '[RESERVED/FUTURE] Create or update custom RBAC roles and permissions.',
  },
];

export const ROLE_PERMISSION_MATRIX: Record<string, string[]> = {
  ADMIN: [
    'users:read',
    'users:update',
    'users:block',
    'users:unblock',
    'jobs:read',
    'jobs:delete',
    'reports:read',
    'reports:resolve',
    'roles:read',
    'roles:assign',
    'roles:revoke',
    'roles:manage',
  ],
  RECRUITER: [
    'jobs:create',
    'jobs:read',
    'jobs:update',
    'jobs:delete',
    'applications:accept',
  ],
  WORKER: ['jobs:read', 'applications:apply', 'applications:withdraw'],
};

export async function seedRbac() {
  console.log('--- Seeding RBAC: Roles ---');
  const roleMap = new Map<string, string>();

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.appRole.upsert({
      where: { code: roleDef.code },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isActive: roleDef.isActive,
        isAssignableOnRegistration: roleDef.isAssignableOnRegistration,
      },
      create: {
        code: roleDef.code,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isActive: roleDef.isActive,
        isAssignableOnRegistration: roleDef.isAssignableOnRegistration,
      },
    });
    roleMap.set(role.code, role.id);
    console.log(`Role [${role.code}] synced (ID: ${role.id})`);
  }

  console.log('\n--- Seeding RBAC: Permissions ---');
  const permMap = new Map<string, string>();

  for (const permDef of BASELINE_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { code: permDef.code },
      update: {
        name: permDef.name,
        module: permDef.module,
        description: permDef.description,
      },
      create: {
        code: permDef.code,
        name: permDef.name,
        module: permDef.module,
        description: permDef.description,
      },
    });
    permMap.set(perm.code, perm.id);
    console.log(`Permission [${perm.code}] synced (ID: ${perm.id})`);
  }

  console.log('\n--- Seeding RBAC: Role-Permission Mappings ---');
  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const roleId = roleMap.get(roleCode);
    if (!roleId) {
      throw new Error(`Role not found in roleMap: ${roleCode}`);
    }

    for (const permCode of permCodes) {
      const permissionId = permMap.get(permCode);
      if (!permissionId) {
        throw new Error(`Permission not found in permMap: ${permCode}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
      console.log(`Mapped Role [${roleCode}] -> Permission [${permCode}]`);
    }
  }

  console.log('\nRBAC seeding completed successfully.');
}

if (require.main === module) {
  seedRbac()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('RBAC Seeding error:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
