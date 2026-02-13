const prisma = require('../lib/prisma');

exports.requestContributionToAdd = async (donorName, amount, phone_no, userId) => {
    return await prisma.contribution_requests.create({
        data: {
          donor_name: donorName,
          amount: String(amount),
          users : {
            connect: { user_id: Number(userId) }
          },
          phone_no: phone_no,
          request_status: "OPEN"
        },
        select: {
          request_id: true,
          donor_name: true,
          amount: true,
          phone_no: true,
          request_status: true,
          created_at: true,
          users: {
            select: {
              user_id: true,
              firstname: true,
              lastname: true,
              email: true,
              phone_no: true
            }
          }
        }
      });
}