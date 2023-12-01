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
    if(err.response?.data){
      throw new Error(err.response?.data)
    }
    throw err;
  }
};

const createVendorCustomer = async (_req) => {
  try {
    const { mobile, email, name, country_code, partner_info } = _req.body;
    if (partner_info) {
      const updatedPartnerData = await updateCustomer({name: name, mobile: mobile, email: email,country_code:country_code, partner: partner_info})
      return updatedPartnerData;
    }
    const customerCreateRes = await createUser({ name, email, mobile, country_code });
    return customerCreateRes;
  } catch (err) {
    if(err.response?.data?.startsWith("Partner validation failed")){
      throw new Error("Invalid request, fields missmatch")
    }
    if(err.response?.data){
      throw new Error(err.response.data)
    }
    throw err;
  }
};

const updatePartnerProfile = async (_req) => {
  try{
    const user = _req.headers.user
    const name = _req.body.name
    const mobile = _req.body.mobile
    const email = _req.body.email
    if(!(user && name && mobile && email)){
      let missingFields = []
      if(!name){
        missingFields.push("name")
      }
      if(!mobile){
        missingFields.push("mobile")
      }
      if(!email){
        missingFields.push("email")
      }
      if(!user){
        missingFields.push("user")
      }
      throw new Error(`Invalid request, missing fields: ${missingFields.join(", ")}`)
    }
    const userDate = await getUserInfo({_id: user})
    const updatedPartnerProfile = await updateCustomer({name: name, email: email, mobile: mobile, partner: userDate.partner})
    return updatedPartnerProfile
  } catch(err){
    throw err
  }
}

export { getPartnerInfo, getUserInfo, createVendorCustomer, getRoles, updatePartnerProfile };
