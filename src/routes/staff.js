import { Router } from "express";
import Utils from "../utils/utils.js";
import {
  otpWithPhp,
  signinWithPhp,
  addStaff,
  getStaff,
  updateStaff,
} from "../services/staff.js";

const staffRouter = Router();

const phpSigininHandler = async (_req, _res) => {
  try {
    const response = await signinWithPhp(_req.body);
    _res.status(200).json(response);
  } catch (_e) {
    console.log(_e);
    Utils.handleError(_e, _res);
  }
};

const phpOtpHandler = async (_req, _res) => {
  try {
    const response = await otpWithPhp(_req.body);
    return _res.status(200).json(response);
  } catch (_e) {
    console.log(_e);
    Utils.handleError(_e, _res);
  }
};

const addStaffHandler = async (_req, _res) => {
  try {
    const response = await addStaff(_req.body);
    return _res.status(200).json(response);
  } catch (_e) {
    console.log(_e);
    Utils.handleError(_e, _res);
  }
};

const updateStaffHandler = async (_req, _res) => {
  try {
    const response = await updateStaff(_req);
    return _res.status(200).json(response);
  } catch (_e) {
    console.log(_e);
    Utils.handleError(_e, _res);
  }
};

const getStaffHandler = async (_req, _res) => {
  try {
    const response = await getStaff(_req);
    return _res.status(200).json(response);
  } catch (_e) {
    console.log(_e);
    Utils.handleError(_e, _res);
  }
};

// Routes that can be accessed without any session (no_auth)
staffRouter.post("/no_auth/mobile-sign-in", phpSigininHandler);
staffRouter.post("/no_auth/mobile-check", phpOtpHandler);
staffRouter.post("/no_auth/mobile-verify-otp", phpOtpHandler);

staffRouter.post("/staff/add-staff", addStaffHandler);
staffRouter.put("/staff/update-staff/:id", updateStaffHandler);
staffRouter.get("/staff/:vendor", getStaffHandler);

export default staffRouter;
