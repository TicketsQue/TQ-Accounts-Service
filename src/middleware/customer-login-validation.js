import { getPartner, getPartnerType } from "../services/customer.js"

const validateCustomerRole = async (_req, _res, _next) => {
    try{
        const mobile = _req.body.mobile
        if(!mobile){
            return _res.status(400).json({"result":"invalid request"})
        }
        const partnerInfo = await getPartner({mobile})
        if(!partnerInfo){
            return _next()
        }
        const partnerType = await getPartnerType({_id: partnerInfo.partner_type})
        if(partnerType.handle === 'customer'){
            return _next()
        }
        return _res.status(403).json({result: "Already registered as a partner, use different mobile number."})
    } catch(err){
        throw err
    }
}

export {validateCustomerRole}