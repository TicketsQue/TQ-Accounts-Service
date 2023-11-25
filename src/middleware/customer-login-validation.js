import { getPartner, getPartnerType } from "../services/customer.js"

const validateCustomerRole = async (_req, _res, _next) => {
    try{
        const mobile = _req.body.mobile
        if(!mobile){
            return _res.status(400).json({"result":"invalid request"})
        }
        const partnerInfo = await getPartner({mobile})
        if(partnerInfo.length === 0){
            return _next()
        }
        for(let i=0;i<partnerInfo.length;i++){
            const partnerType = await getPartnerType({_id: partnerInfo[i].partner_type})
            if(partnerType.handle === 'customer'){
                _req.body.partner_info = partnerInfo[i]
                return _next()
            }
        }
        return _next()
    } catch(err){
        throw err
    }
}

export {validateCustomerRole}