import { Router } from "express";
import Utils from "../utils/utils.js";
import {
  createVendorCustomer,
  getPartnerInfo,
  getUserInfo,
  getRoles,
  updatePartnerProfile,
} from "../services/info.js";
import { validateCustomerRole } from "../middleware/customer-login-validation.js";
import errorResponse from "../utils/response.js";

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

infoRouter.post(
  "/info/customer/create",
  validateCustomerRole,
  createVendorCustomerHandler
);
infoRouter.get("/info/account/:pid", getPartnerInfoHandler);
infoRouter.get("/info/user/:id", getUserInfoHandler);
infoRouter.get("/info/roles", getRolesHandler);

// edit partner account
infoRouter.put("/info/user", updatePartnerHandler)

export default infoRouter;
