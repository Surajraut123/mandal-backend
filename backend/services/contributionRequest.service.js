const prisma = require('../lib/prisma');
const { checkUserRole } = require('./checkUserRole');

exports.getContributionRequests = async (userId = null, status = null, filters = {}) => {
  const whereClause = {};

  if(userId) {
    const {canViewAllRecords} = await checkUserRole(userId)
  
    if(!canViewAllRecords) {
      whereClause.user_id = userId
    }
  }

  if (status) {
    console.log("status : ", status)
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

  if (filters.dateFrom || filters.dateTo) {
    whereClause.created_at = {};
    if (filters.dateFrom) whereClause.created_at.gte = new Date(filters.dateFrom);
    if (filters.dateTo) whereClause.created_at.lte = new Date(filters.dateTo);
  }

  console.log("whereclause : ", whereClause)

  return prisma.contribution_requests.findMany({
    where: whereClause,
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