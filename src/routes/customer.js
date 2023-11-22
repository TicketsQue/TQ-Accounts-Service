import { Router } from "express";
import Utils from "../utils/utils.js";
import {
  customerCreate,
  customerSignInAndUpdate,
  getConstants,
} from "../services/customer.js";
import { validateCustomerRole } from "../middleware/customer-login-validation.js";

const customerRouter = Router();

const customerCreateHandler = async (_req, _res) => {
  try {
    // console.log("create customer called")
    const response = await customerCreate(_req.body);
    _res.status(200).json(response);
  } catch (_e) {
    console.log(_e);
    Utils.handleError(_e, _res);
  }
};

const customerSignInHandler = async (_req, _res) => {
  try {
    const response = await customerSignInAndUpdate(_req.body);
    return _res.status(200).json(response);
  } catch (_e) {
    console.log(_e);
    Utils.handleError(_e, _res);
  }
};

//migrated to customer service
// const authCustomerUpdateHandler = async (_req, _res) => {
//   try {
//     const response = await customerAuthSignInUpdate(_req.body);
//     return _res.status(200).json(response);
//   } catch (_e) {
//     console.log(_e);
//     Utils.handleError(_e, _res);
//   }
// };

const getConstantsHandler = async (_req, _res) => {
  try{
    _res.status(200).json(await getConstants(_req))
  }catch(_e){
    Utils.handleError(_e, _res)
  }
}
// Routes that can be accessed without any session (no_auth)
customerRouter.post("/no_auth/customer", validateCustomerRole, customerCreateHandler);
customerRouter.post("/no_auth/sign-in", customerSignInHandler);
customerRouter.get("/no_auth/constants", getConstantsHandler)

//Routes that required active user session (auth) //migrated to customer_service
// customerRouter.put("/info/updateCustomer", authCustomerUpdateHandler);

export default customerRouter;
