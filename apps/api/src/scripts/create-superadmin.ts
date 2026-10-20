import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import * as readline from 'readline';

const prisma = new PrismaClient();

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('=== LoboFlow — Criação/Promoção de SuperAdmin Global ===');

  let email = process.env.SUPERADMIN_EMAIL;
  let name = process.env.SUPERADMIN_NAME;
  let password = process.env.SUPERADMIN_PASSWORD;

  // Se não foi passado via env/args, solicita no terminal
  if (!email) {
    email = await prompt('E-mail do SuperAdmin: ');
  }
  if (!name) {
    name = (await prompt('Nome completo: ')) || 'SuperAdmin';
  }

  if (!email || !email.includes('@')) {
    console.error('E-mail inválido.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    console.log(`Usuário com e-mail ${email} já existe. Promovendo a SuperAdmin...`);
    await prisma.user.update({
      where: { id: existing.id },
      data: { isSuperAdmin: true },
    });
    console.log(`✓ Usuário ${existing.name} (${existing.email}) agora é SuperAdmin!`);
    return;
  }

  if (!password) {
    password = await prompt('Senha (mínimo 10 caracteres): ');
  }

  if (!password || password.length < 10) {
    console.error('A senha deve ter ao menos 10 caracteres.');
    process.exit(1);
  }

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
      isSuperAdmin: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✓ SuperAdmin criado com sucesso! ID: ${user.id}, E-mail: ${user.email}`);
}

main()
  .catch((err) => {
    console.error('Falha ao criar SuperAdmin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
