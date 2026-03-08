const prisma = require('../lib/prisma');
const { checkUserRole } = require('./checkUserRole');


exports.getInvestmentRequests = async (userId = null, status = null, filters = {}) => {
    const whereClause = {};

    if(userId) {
        const {canViewAllRecords} = await checkUserRole(userId)

        if(!canViewAllRecords) {
            whereClause.user_id = userId
        }
    }

    if (status) {
        whereClause.request_status = status.toUpperCase();
    }
    if (filters.minAmount !== null && filters.minAmount !== undefined) {
        whereClause.amount = { 
          ...whereClause.amount, 
          gte: parseFloat(filters.minAmount) 
        };
    }
      
    if (filters.maxAmount !== null && filters.maxAmount !== undefined) {
        whereClause.amount = { 
            ...whereClause.amount, 
            lte: parseFloat(filters.maxAmount)
        };
    }

    if (filters.donorName) {
        whereClause.donor_name = { contains: filters.donorName, mode: 'insensitive' };
    }

    if (filters.phoneNo) {
        whereClause.phone_no = filters.phoneNo;
    }

    if (filters.shopName) {
        whereClause.shop_name = { contains: filters.shopName, mode: 'insensitive' };
    }

    if (filters.title) {
        whereClause.title = { contains: filters.title, mode: 'insensitive' };
    }

    if (filters.description) {
        whereClause.description = { contains: filters.description, mode: 'insensitive' };
    }

    if (filters.dateFrom || filters.dateTo) {
        whereClause.created_at = {};
        if (filters.dateFrom) whereClause.created_at.gte = new Date(filters.dateFrom);
        if (filters.dateTo) whereClause.created_at.lte = new Date(filters.dateTo);
    }
    return prisma.investment_requests.findMany({
        where: whereClause,
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