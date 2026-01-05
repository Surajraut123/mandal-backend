BackendApis : 

userRegistration : Registration will happen for mandal member only
required params : router.post('/register', userRegistration);
{
  "firstName" : "Sujwal",
  "lastName" : "Naik",
  "profileImage" : "", //optional
  "contact" : "2345678",
  "email" : "dummy@gmail.com",
  "password" : "pass@123",
  "role" : "admin"
}

userLogin : For Mandal members only
required params : router.post('/login', userLogin);
{
    "email" : "dummy@gmail.com"
    "password" : "1234"
}

contributions : 
required params : router.post('/mandal-contribution', contributions);
{
    "userId" : "", LoggedIn userId - to know who added the entry of contribution
    "amount" : 1234, integer value only
    "donorName" : (If donor deny to give name, that entry will go as a Anonymous user)
    "phone_no" : (If user gives then we will identify unique donor user, based on phone no otherwise will consider anonymous) //optional 
}


getContributions : 
api : router.get('/contributed-users', getContributedUsers);

getMandalMembers : 
api : router.get('/mandal-members', getMandalMembers);


requestContributionToAddInMandal : 
required Params : router.post('/request-contribution', requestContributionToAddInMandal);

{
    "donorName" : (If donor deny to give name, that entry will go as a Anonymous user)
    "phone_no" : (If user gives then we will identify unique donor user, based on phone no otherwise will consider anonymous) //optional
    "userId" : LoggedIn userId - to know who added the entry of contribution //int
    "amount" : 1234, integer value only
}


fetchContributionRequests : 
api : router.get('/fetch-requests', fetchContributionRequests);


updateContributionRequest : this action can be done by treasurer only, not even admin.
api : router.patch('/contribution-request/:contribution_id/:status', updateContributionRequestStatus);

query params : contribution_id and status name ("Approved", "Rejected") default is "Open"

addMandalInvestment : 
api : /mandal-investment
{
  "userId" : 2, Int
  "amount" : 500, Int
  "title" : "Bamboo", 
  "description" : "", optional
  "shopName" : "Mangilal",
  "role" : "member"
}
