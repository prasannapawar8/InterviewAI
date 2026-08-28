import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { seedIfNeeded } from '../src/db.js'

const prisma = new PrismaClient()

async function main() {
  await seedIfNeeded()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
