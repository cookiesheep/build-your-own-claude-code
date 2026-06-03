import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import {
  createPasswordUser,
  getPasswordUserByUsername,
  initDatabase,
  type UserRole,
} from '../db/database.js';

type ParsedArgs = {
  username: string;
  password: string;
  role: UserRole;
};

function readValue(args: string[], name: string): string | undefined {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function parseArgs(args: string[]): ParsedArgs {
  const username = readValue(args, '--username')?.trim();
  const password = readValue(args, '--password');
  const role = (readValue(args, '--role') ?? 'user').trim() as UserRole;

  if (!username) {
    throw new Error('--username is required');
  }

  if (!password) {
    throw new Error('--password is required');
  }

  if (password.length < 6) {
    throw new Error('--password must be at least 6 characters');
  }

  if (role !== 'admin' && role !== 'user') {
    throw new Error('--role must be "admin" or "user"');
  }

  return { username, password, role };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  initDatabase();

  const existingUser = getPasswordUserByUsername(args.username);
  if (existingUser) {
    console.log(`User "${args.username}" already exists (id=${existingUser.id}, role=${existingUser.role}).`);
    return;
  }

  const passwordHash = await bcrypt.hash(args.password, 10);
  const user = createPasswordUser({
    id: randomUUID(),
    username: args.username,
    passwordHash,
    role: args.role,
  });

  console.log(`Created user "${user.username}" (id=${user.id}, role=${user.role}).`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to create user: ${message}`);
  process.exitCode = 1;
});
