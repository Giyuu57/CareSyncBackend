export const roles = (...availableroles)=>{return (req,res,next)=>{
    if(!availableroles.includes(req.user.role)){
        throw new Error('ForbiddenError');
    }else{
        next();
    }
}
};