const prisma = require('../lib/prisma');

exports.requestInvestmentToAdd = async (shopName, userId, amount, title, description) => {
    return prisma.investment_requests.create({
        data: {
          shop_name: shopName,
          amount: String(amount),
          title: title,
          description: description,
          users : {
            connect: { user_id: Number(userId) }
          },
          request_status: "OPEN"
        },
        select: {
          request_id: true,
          title: true,
          amount: true,
          shop_name: true,
          description: true,
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