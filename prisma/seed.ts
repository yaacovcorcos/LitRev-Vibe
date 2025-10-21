import { PrismaClient } from '../src/generated/prisma';

import { DEFAULT_PROJECT_SETTINGS } from '../src/lib/projects/settings';

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.upsert({
    where: { id: 'demo-project' },
    update: {},
    create: {
      id: 'demo-project',
      name: 'Demo Medical Review',
      description: 'Seed project for development and testing.',
      settings: DEFAULT_PROJECT_SETTINGS,
      researchPlans: {
        create: {
          scope: { population: 'Adults with hypertension', intervention: 'Lifestyle modifications' },
          queryStrategy: { boolean: '("hypertension" OR "high blood pressure") AND lifestyle' },
          targetSources: ['pubmed', 'crossref'],
          outline: { sections: ['Introduction', 'Methods', 'Results', 'Discussion'] },
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: project.id,
      actor: 'system',
      action: 'project.seeded',
      payload: { note: 'Initial seed data created.' },
    },
  });

  console.log('Seed data created successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
