const prisma = require('../lib/prisma');

exports.checkUserRole = async (userId) => {

    const user = await prisma.users.findUnique({
        where : {user_id : userId},
        select: {
            roles : {
                select : {
                    role_name : true
                }
            },
            firstname: true,
            lastname: true,
            profile: true, 

        }
    })

    if(!user) {
        throw new Error("User not found")
    }

    const roleName = user.roles.role_name.toLowerCase();
    const fullName = user.firstname + " " + user.lastname;
    return {
        roleName,
        isTreasurer: roleName === 'treasurer',
        isAdmin: roleName === 'admin',
        isMember: roleName === 'member',
        canViewAllRecords: roleName === 'treasurer' || roleName === 'admin',
        fullName,
        profile: user.profile
    };
}