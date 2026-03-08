const prisma = require('../lib/prisma');


exports.getMandalMembers = async () => {
    return prisma.users.findMany({
        select: {
          user_id: true,
          firstname: true,
          lastname: true,
          email: true,
          phone_no: true,
          profile: true,
          status: true,
          roles: {
            select: {
              role_name: true
            }
          }
        }
      });
}