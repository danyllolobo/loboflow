import { PrismaClient } from '@prisma/client';
import { MODULES, SCOPED_PERMISSIONS } from '@loboflow/shared';

const prisma = new PrismaClient();

export async function seedPermissions() {
  console.log('Sincronizando catálogo de permissões no banco de dados...');

  let count = 0;
  for (const mod of MODULES) {
    for (const action of mod.actions) {
      const key = `${mod.key}.${action.key}`;
      const isScoped = SCOPED_PERMISSIONS.has(key);

      await prisma.permission.upsert({
        where: { key },
        update: {
          module: mod.key,
          action: action.key,
          description: `${mod.label}: ${action.label}`,
          scoped: isScoped,
        },
        create: {
          key,
          module: mod.key,
          action: action.key,
          description: `${mod.label}: ${action.label}`,
          scoped: isScoped,
        },
      });
      count++;
    }
  }

  console.log(`✓ ${count} permissões sincronizadas com sucesso.`);
}

async function main() {
  try {
    await seedPermissions();
  } catch (err) {
    console.error('Erro ao executar seed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
