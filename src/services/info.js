import axios from "axios";
import { createUser, getPartner, updateCustomer } from "./customer.js";
import { getSignedLink, uploadToS3 } from "../helpers/s3.js";
import { capitalize } from "../utils/strings.js";
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

const getCustomerSuggesions = async (_req) => {
  try{
    const { user } = _req.headers
    const mobile  = _req.query.mobile || null
    if(!user){
      throw new Error("Invalid request")
    }
    const userData = await getUserInfo({_id: user})
    const vendor = userData?.vendor?._id
    const vendorCustomersList = await axios.get(`${process.env.SYSTEM_SERVER}/system/partners/${vendor}/customers`,
      {
        params: _req.query,
      }
    )
    if(!mobile){
      return vendorCustomersList.data
    }
    //filter according to mobile number
    const customerData = vendorCustomersList.data.allCustomers.find(data => data.customer?.mobile === mobile)
    if(!customerData){
      throw new Error("Customer not found")
    }
    const customer = customerData.customer
    return {
      payload:{
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email
      }
    }
    
  }catch(err){
    if(err.response?.data){
      console.log(err.response.data)
      throw new Error(err.response.data)
    }
    throw err
  }
}

const updatePartnerProfile = async (_req) => {
  try{
    const userProfileImg = _req.files['profile_img']
    const user = _req.headers.user
    const name = capitalize(_req.body.name)
    const mobile = _req.body.mobile
    const email = _req.body.email
    const countryCode = _req.body.country_code
    if(!(user)){
      throw new Error(`Invalid request`)
    }
    const updateData = {}
    if(name){
      updateData.name = name
    }
    if(email){
      updateData.email = email
    }
    if(countryCode){
      updateData.country_code = countryCode
    }
    const userDate = await getUserInfo({_id: user})
    if(userProfileImg && userProfileImg?.length === 1){
      const imgData = await uploadToS3({file: userProfileImg[0], vendorID: userDate?.vendor?._id, userID: user, })
      updateData.profile_img = imgData.object_key
    }
    const updateResponse = await axios.put(
      `${process.env.SYSTEM_SERVER}/system/users/${user}`,
      updateData
    );
    return updateResponse.data
  } catch(err){
    if(err.response?.data){
      throw new Error(err.response?.data)
    }
    throw err
  }
}

export { getPartnerInfo, getUserInfo, createVendorCustomer, getRoles, updatePartnerProfile, getCustomerSuggesions };
