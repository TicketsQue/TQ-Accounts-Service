import { Router } from "express";
import errorResponse from "../utils/response.js";
import { getQrCardBasicData, registerCardToCustomer } from "../services/qr_card.js";
import { getUserInfo } from "../services/info.js";

const qrCardRoutes = Router();

const registerCardToCustomerHandler = async (_req, _res) => {
    try {
        const {user} = _req.headers
        if(!user){
            throw new Error("Invalid request")
        }
        const currentUserData = getUserInfo({_id: user})
        if(!currentUserData){
            throw new Error("Invalid request")
        }
        return _res.status(200).json(await registerCardToCustomer(..._req.body, ..._req.headers))
    } catch (_e) {
        if (_e.message.toLowerCase().startsWith("access denied") || _e.message.toLowerCase().startsWith("unauthorized") || _e.message.toLowerCase().startsWith('ticket cannot be canceled')) {
            return errorResponse(_e, 403, _res)
        }
        if (_e.message.toLowerCase().startsWith('invalid request') || _e.message.toLowerCase().startsWith('ticket is already canceled')) {
            return errorResponse(_e, 400, _res)
        }
        console.log("Server error while creating card")
        console.log(_e)
        return errorResponse(new Error("Something went wrong, Please try again later."), 500, _res)
    }
} 

const getQrCardDataHandler = async (_req, _res) => {
    try{
        const {user} = _req.headers
        if(!user){
            throw new Error("Invalid request")
        }
        const currentUserData = await getUserInfo({_id: user})
        if(!currentUserData){
            throw new Error("Invalid request")
        }
        return _res.status(200).json(await getQrCardBasicData({qr_token:_req.params?.qr_token}))
    } catch(_e){
        if (_e.message.toLowerCase().startsWith("access denied") || _e.message.toLowerCase().startsWith("unauthorized") || _e.message.toLowerCase().startsWith('ticket cannot be canceled')) {
            return errorResponse(_e, 403, _res)
        }
        if (_e.message.toLowerCase().startsWith('invalid request') || _e.message.toLowerCase().startsWith('ticket is already canceled')) {
            return errorResponse(_e, 400, _res)
        }
        console.log("Server error while creating card")
        console.log(_e)
        return errorResponse(new Error("Something went wrong, Please try again later."), 500, _res)
    }
}

qrCardRoutes.post("/qr/register", registerCardToCustomerHandler)

//no_auth route to get qr card basic data
qrCardRoutes.get("/no_auth/qr/:qr_token", getQrCardDataHandler)

export default qrCardRoutes