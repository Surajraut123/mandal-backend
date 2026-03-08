
const prisma = require('../lib/prisma');
exports.createContribution = async ({
    userId,
    amount,
    donorName,
    phone_no
  }) => {
    return prisma.contributions.create({
      data: {
        users: {
          connect: { user_id: userId }
        },
        amount: Number(amount),
        donor_name: donorName,
        phone_no:
          typeof phone_no === "string" && phone_no.trim()
            ? phone_no.trim()
            : null,
        contribution_date: new Date()
      }
    });
};
  