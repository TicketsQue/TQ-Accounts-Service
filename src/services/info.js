import axios from "axios";
import { createUser, getPartner, updateCustomer } from "./customer.js";
/**
 * making API call to fetch partner information from SYSTEM service
 * @param {string} pid The partner_id whose information needs to be fetched
 * @returns {Object} Partner information
 */
const getRoles = async () => {
  try {
    //URL 'SYSTEM_SERVER' for the system service is added in .env
    const response = await axios.get(
      `${process.env.SYSTEM_SERVER}/system/roles`
    );
    return response.data.payload;
  } catch (errors) {
    throw errors;
  }
};

const getPartnerInfo = async (pid) => {
  try {
    //URL 'SYSTEM_SERVER' for the system service is added in .env
    const response = await axios.get(
      `${process.env.SYSTEM_SERVER}/system/partners/${pid}/information`
    );
    return response.data;
  } catch (errors) {
    throw errors;
  }
};

const getUserInfo = async ({ _id }) => {
  try {
    const response = await axios.get(
      `${process.env.SYSTEM_SERVER}/system/users/${_id}`
    );
    const userData = response.data;
    if (!userData) {
      throw new Error("User does not exist");
    }
    delete userData.otp;
    delete userData.password;
    delete userData.last_access;
    return userData;
  } catch (err) {
    throw err;
  }
};

const createVendorCustomer = async (_req) => {
  try {
    const { mobile, email, name } = _req.body;
    const partnerCheck = await getPartner({ mobile });
    if (partnerCheck) {
      const updatedPartnerData = await updateCustomer({name: name, mobile: mobile, email: email, partner: partnerCheck})
      return updatedPartnerData;
    }
    const customerCreateRes = await createUser({ name, email, mobile });
    return customerCreateRes;
  } catch (err) {
    throw err;
  }
};

export { getPartnerInfo, getUserInfo, createVendorCustomer, getRoles };
