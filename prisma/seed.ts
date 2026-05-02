import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const db = new PrismaClient()

async function main() {
  // Create default admin
  const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex')
  
  await db.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'Administrator',
    },
  })

  // Create sample groups
  const group1 = await db.group.upsert({
    where: { id: 'group-zone-a' },
    update: {},
    create: {
      id: 'group-zone-a',
      name: 'Zone A - Premium',
      logo: 'https://api.dicebear.com/9.x/initials/svg?seed=ZA&backgroundColor=059669',
      monthlyTarget: 50000000,
      week1Target: 20,
      week2Target: 25,
      week3Target: 25,
      week4Target: 30,
    },
  })

  const group2 = await db.group.upsert({
    where: { id: 'group-zone-b' },
    update: {},
    create: {
      id: 'group-zone-b',
      name: 'Zone B - Regular',
      logo: 'https://api.dicebear.com/9.x/initials/svg?seed=ZB&backgroundColor=0891b2',
      monthlyTarget: 35000000,
      week1Target: 20,
      week2Target: 25,
      week3Target: 25,
      week4Target: 30,
    },
  })

  const group3 = await db.group.upsert({
    where: { id: 'group-zone-c' },
    update: {},
    create: {
      id: 'group-zone-c',
      name: 'Zone C - Starter',
      logo: 'https://api.dicebear.com/9.x/initials/svg?seed=ZC&backgroundColor=d97706',
      monthlyTarget: 20000000,
      week1Target: 22,
      week2Target: 24,
      week3Target: 26,
      week4Target: 28,
    },
  })

  // Create sample crews
  const crews = [
    { name: 'Ahmad Rizky', employeeId: 'EMP001', groupId: group1.id, photo: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ahmad' },
    { name: 'Siti Nurhaliza', employeeId: 'EMP002', groupId: group1.id, photo: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Siti' },
    { name: 'Budi Santoso', employeeId: 'EMP003', groupId: group2.id, photo: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Budi' },
    { name: 'Dewi Lestari', employeeId: 'EMP004', groupId: group2.id, photo: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Dewi' },
    { name: 'Fajar Nugroho', employeeId: 'EMP005', groupId: group3.id, photo: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Fajar' },
    { name: 'Rina Wulandari', employeeId: 'EMP006', groupId: group3.id, photo: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rina' },
  ]

  for (const crew of crews) {
    await db.crew.upsert({
      where: { employeeId: crew.employeeId },
      update: {},
      create: crew,
    })
  }

  console.log('Seed data created successfully!')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
