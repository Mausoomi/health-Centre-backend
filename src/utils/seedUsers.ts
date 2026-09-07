import { User } from '../models/User';

export const seedInitialUsersIfEmpty = async () => {
  try {
    // Sanitize any legacy placeholder avatars from DB
    await User.updateMany(
      { avatar: { $regex: 'randomuser\\.me' } },
      { $set: { avatar: '' } }
    );

    const count = await User.countDocuments();
    if (count === 0) {
      console.log('Seeding initial users into MongoDB...');

      const initialSeed = [
        {
          memberId: 'HC-24108',
          name: 'Aisha Bello',
          email: 'aisha.bello@healthmail.com',
          password: 'Password123!',
          phone: '+234 802 123 4567',
          status: 'Active',
          plan: 'Free Plan',
          gender: 'Female',
          country: 'Nigeria',
          avatar: '',
          isVerified: true,
          advertsCount: 3,
          vouchersCount: 5,
          paymentsCount: 2,
          lastActive: new Date(),
          notes: [
            {
              id: 'note-1',
              note: 'Account verified via identity documentation.',
              createdAt: new Date(Date.now() - 86400000 * 2),
              createdBy: 'Operations Admin',
            },
          ],
        },
        {
          memberId: 'HC-24091',
          name: 'Daniel Okoro',
          email: 'daniel.okoro@healthmail.com',
          password: 'Password123!',
          phone: '+234 803 987 6543',
          status: 'Watch',
          plan: 'Free Plan',
          gender: 'Male',
          country: 'Nigeria',
          avatar: '',
          isVerified: false,
          advertsCount: 1,
          vouchersCount: 2,
          paymentsCount: 1,
          lastActive: new Date(Date.now() - 3600000 * 5),
          notes: [
            {
              id: 'note-2',
              note: 'Flagged for multiple rapid login attempts from new device.',
              createdAt: new Date(Date.now() - 3600000 * 12),
              createdBy: 'Moderation Admin',
            },
          ],
        },
        {
          memberId: 'HC-24062',
          name: 'Fatima Lawal',
          email: 'fatima.lawal@healthmail.com',
          password: 'Password123!',
          phone: '+234 805 555 1212',
          status: 'Suspended',
          plan: 'Free Plan',
          gender: 'Female',
          country: 'Nigeria',
          avatar: '',
          isVerified: true,
          advertsCount: 0,
          vouchersCount: 4,
          paymentsCount: 0,
          lastActive: new Date(Date.now() - 86400000 * 7),
          notes: [
            {
              id: 'note-3',
              note: 'Account suspended pending identity re-verification.',
              createdAt: new Date(Date.now() - 86400000 * 5),
              createdBy: 'Global Admin',
            },
          ],
        },
        {
          memberId: 'HC-24011',
          name: 'Musa Ibrahim',
          email: 'musa.ibrahim@healthmail.com',
          password: 'Password123!',
          phone: '+234 807 333 4444',
          status: 'Deactivated',
          plan: 'Free Plan',
          gender: 'Male',
          country: 'Nigeria',
          avatar: '',
          isVerified: true,
          advertsCount: 2,
          vouchersCount: 0,
          paymentsCount: 3,
          lastActive: new Date(Date.now() - 86400000 * 15),
          notes: [
            {
              id: 'note-4',
              note: 'Member requested account deactivation on 06/08/2026.',
              createdAt: new Date(Date.now() - 86400000 * 14),
              createdBy: 'Operations Admin',
            },
          ],
        },
        {
          memberId: 'HC-10044',
          name: 'Alex Morgan',
          email: 'alex.morgan@example.com',
          password: 'Password123!',
          phone: '+234 801 234 5678',
          status: 'Active',
          plan: 'Free Plan',
          gender: 'Female',
          country: 'Nigeria',
          avatar: '',
          isVerified: true,
          advertsCount: 2,
          vouchersCount: 3,
          paymentsCount: 1,
          lastActive: new Date(),
        },
      ];

      for (const u of initialSeed) {
        await User.create(u);
      }

      console.log('Initial users seeded successfully into MongoDB.');
    }
  } catch (error) {
    console.error('Error seeding initial users:', error);
  }
};
