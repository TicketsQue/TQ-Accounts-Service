import { Router } from "express";
import Utils from "../utils/utils.js";
import {
  createVendorCustomer,
  getPartnerInfo,
  getUserInfo,
  getRoles,
  updatePartnerProfile,
  getCustomerSuggesions,
  getTicketOrderInfo,
  getAllTickets,
  getTicketCounts,
  getAllCustomerData,
  sendContinueBooking,
  sendContinueVendorMessage,
} from "../services/info.js";
import { validateCustomerRole } from "../middleware/customer-login-validation.js";
import errorResponse from "../utils/response.js";
import multer from "../middleware/multer.js";

const infoRouter = Router();

/**
 * Function to handle get request for partner account information
 * @param {Express.Request} _req
 * @param {Express.Response} _res
 */
const getPartnerInfoHandler = async (_req, _res) => {
  try {
    //pid: partner id
    const pid = _req.params["pid"];
    _res.status(200).json(await getPartnerInfo(pid));
  } catch (_e) {
    Utils.handleError(_e, _res);
  }
};

const getUserInfoHandler = async (_req, _res) => {
  try {
    _res.status(200).json(await getUserInfo({ _id: _req.params.id }));
  } catch (_e) {
    Utils.handleError(_e, _res);
  }
};

const createVendorCustomerHandler = async (_req, _res) => {
  try {
    _res.status(200).json(await createVendorCustomer(_req));
  } catch (_e) {
    Utils.handleError(_e, _res);
  }
};

const getRolesHandler = async (_req, _res) => {
  try {
    _res.status(200).json(await getRoles(_req));
  } catch (_e) {
    Utils.handleError(_e, _res);
  }
};

//handler function to handle vendor and staff profile update(also can be used to update customer)
const updatePartnerHandler = async (_req, _res) => {
  try{
    _res.status(200).json(await updatePartnerProfile(_req))
  } catch(_e){
    //invalid request
    if(_e.message.toLowerCase().startsWith("invalid request")){
      return errorResponse(_e, 400, _res)
    }

    //unhandeled server error!!
    return errorResponse(_e, 500, _res)
  }
}
const getTicketCountsHandler = async (_req, _res) => {
  try{
    _res.status(200).json(await getTicketCounts(_req))
  } catch(_e){
    if(_e.message.toLowerCase().startsWith("access denied")){
      return errorResponse(_e, 403, _res)
    }
    console.log("unhandled server on get all tickets")
    console.log(_e)
    return errorResponse(new Error("some thing went wrong"), 500, _res)
  }
}

const getAllTicketsHandler = async(_req, _res) => {
  try{
    _res.status(200).json(await getAllTickets(_req))
  } catch(_e){
    if(_e.message.toLowerCase().startsWith("invalid request")){
      return errorResponse(_e, 400, _res)
    }
    if(_e.message.toLowerCase().endsWith("not found")){
      return errorResponse(_e, 404, _res)
    }
    if(_e.message.toLowerCase().endsWith("access denied")){
      return errorResponse(_e, 403, _res)
    }
    console.log("unhandled server on get all tickets")
    console.log(_e)
    return errorResponse(new Error("some thing went wrong"), 500, _res)
  }
}

const getCustomerSuggesionHandler = async(_req, _res) => {
  try{
    return _res.status(200).json(await getCustomerSuggesions(_req))
  } catch(_e){
    if(_e.message.toLowerCase().startsWith("invalid request")){
      return errorResponse(_e, 400, _res)
    }
    if(_e.message.toLowerCase().endsWith("not found")){
      return errorResponse(_e, 404, _res)
    }
    return errorResponse(_e, 500, _res)
  }
}

const getAllCustomerDataHander = async (_req, _res) => {
  try{
    _res.status(200).json(await getAllCustomerData(_req))
  } catch(_e){
    if(_e.message.toLowerCase().startsWith("invalid request")){
      return errorResponse(_e, 400, _res)
    }
    if(_e.message.toLowerCase().endsWith("not found")){
      return errorResponse(_e, 404, _res)
    }
    if(_e.message.toLowerCase().endsWith("access denied")){
      return errorResponse(_e, 403, _res)
    }
    console.log("unhandled server on get all tickets")
    console.log(_e)
    return errorResponse(new Error("some thing went wrong"), 500, _res)
  }
}

const getTicketsPaymentInfoHandler = async (_req, _res) => {
  try{
    return _res.status(200).json(await getTicketOrderInfo(_req))
  } catch(_e){
    return errorResponse(_e, 500, _res)
  }
}

//continue booking handler
const continueBookingHandler = async (_req, _res) => {
  try{
    return _res.status(200).json(await sendContinueBooking(_req))
  } catch(_e){
    if(_e.message.toLowerCase().startsWith("invalid request")){
      return errorResponse(_e, 400, _res)
    }
    if(_e.message.toLowerCase().endsWith("not found")){
      return errorResponse(_e, 404, _res)
    }
    if(_e.message.toLowerCase().startsWith("access denied")){
      return errorResponse(_e, 403, _res)
    }
    console.log("unhandled server on get all tickets")
    console.log(_e)
    return errorResponse(new Error("some thing went wrong"), 500, _res)
  }
}
const continueVendorBookingHandler = async (_req, _res) => {
  try{
    return _res.status(200).json(await sendContinueVendorMessage(_req))
  } catch(_e){
    if(_e.message.toLowerCase().startsWith("invalid request")){
      return errorResponse(_e, 400, _res)
    }
    if(_e.message.toLowerCase().endsWith("not found")){
      return errorResponse(_e, 404, _res)
    }
    if(_e.message.toLowerCase().startsWith("access denied")){
      return errorResponse(_e, 403, _res)
    }
    console.log("unhandled server on get all tickets")
    console.log(_e)
    return errorResponse(new Error("some thing went wrong"), 500, _res)
  }
}


infoRouter.post(
  "/info/customer/create",
  validateCustomerRole,
  createVendorCustomerHandler
);
infoRouter.get("/info/account/:pid", getPartnerInfoHandler);
infoRouter.get("/info/user/:id", getUserInfoHandler);
infoRouter.get("/info/roles", getRolesHandler)

infoRouter.get("/info/customer/suggestion", getCustomerSuggesionHandler)

// edit partner account
infoRouter.put("/info/user",multer.fields([{name: "profile_img" ,maxCount:1}]) ,updatePartnerHandler)

//get ticket orders data
infoRouter.get("/info/tickets/orders", getTicketsPaymentInfoHandler)

infoRouter.get("/info/tickets/list", getAllTicketsHandler)

infoRouter.get("/info/tickets/count", getTicketCountsHandler)

infoRouter.get("/info/customers/all", getAllCustomerDataHander)

// continue booking endpoint
infoRouter.post("/info/continue/booking", continueBookingHandler)

infoRouter.post("/info/continue/vendor/booking", continueVendorBookingHandler)

export default infoRouter;
