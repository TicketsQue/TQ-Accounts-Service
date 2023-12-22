import axios from "axios";
import { createUser, getPartner, updateCustomer } from "./customer.js";
import { getSignedLink, uploadToS3 } from "../helpers/s3.js";
import { capitalize } from "../utils/strings.js";
import EM from "../utils/entity.js";
import Utils from "../utils/utils.js";
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

//ticket orders info
const getTicketOrderInfo = async (_req) => {
  try{
    const user = _req.headers.user
    if(!user){
      throw new Error("Unauthorized request")
    }
    const showSuccess = _req.query.success === "true"? true : false
    const ticketOrders = await EM.getModel("ticketsDB", "ticket_orders")
    const eventModel = await EM.getModel("eventsDB", "events");
    const ticketParamMap = await EM.getModel("ticketsDB", "ticket_param_mapping");
    const search = _req.query.search ? _req.query.search : null;
    const page = parseInt(_req.query.page) || 0;
    const skip = page * parseInt(process.env.PAGE_SIZE);
    const limit = parseInt(process.env.PAGE_SIZE);
    const currentUser = await getUserInfo({_id: user})
    const vendor = _req.query.vendor ? true : false
    if(!(currentUser.role.handle === "sub-admin" || currentUser.role.handle === "admin" || currentUser.role.handle === "system" )){
      throw new Error("Access Denied")
    }
    if(ticketOrders){
      let findConfig = {
        user_id: null,
        vendor: {$ne:"656c73b0cb27bc8c6241e70c"}
      }
      if(showSuccess){
        findConfig.payment_status = "PAYMENT_SUCCESS"
      } else {
        findConfig.payment_status = {$ne:"PAYMENT_SUCCESS"}
      }
      // old config
      // const findConfig = {user_id: null, payment_status:{$ne:"PAYMENT_SUCCESS"}, vendor: {$ne:"656c73b0cb27bc8c6241e70c"}}
      let searchConfig = []
      if (search) {
        searchConfig.push({ "customer_name": { $regex: new RegExp(search, "i") } })
        searchConfig.push({ "customer_mobile": { $regex: new RegExp(search, "i") } })
        searchConfig.push({ "ticket_tracking_id": { $regex: new RegExp(search, "i") } })
      }
      if(vendor){
        if(currentUser.role.handle === "system"){
          findConfig.vendor = _req.body.vendor
        } else {
          findConfig.vendor = currentUser?.vendor?._id
        }
      }
      let query = { ...findConfig };

      if (searchConfig.length > 0) {
        query = {
          $and: [findConfig, { $or: searchConfig }],
        };
      }
      const _count = await ticketOrders.countDocuments(query)
      const ordersData = await ticketOrders.find(query)
      .sort({createdAt:-1})
      .skip(skip)
      .limit(limit)

      let payload = []
      for(let i=0;i<ordersData?.length;i++){
        let temp = {}
        let customer_data = await getPartnerByPartnerId({id: ordersData[i].customer_id})
        if(!customer_data){
          try{
            customer_data = (await getUserInfo({ _id: ordersData[i].customer_id})).partner
          }
           catch(err){
            if(err?.message === "User not found"){
              customer_data = null
            } else {
              console.log(err)
            }
          }
        }
        temp.customer_data = customer_data
        let event_data = await eventModel.findOne({_id: ordersData[i].association}).lean()
        temp.event_data = event_data
        let vendor_data = await getPartnerByPartnerId({id: ordersData[i].vendor})
        temp.vendor_data = vendor_data
        let payment_data = {}
        payment_data.total_price = ordersData[i]?.total_price
        payment_data.platform_fee = ordersData[i]?.platform_fee 
        payment_data.gst_fee = ordersData[i]?.gst_fee
        payment_data.payment_status = ordersData[i]?.payment_status
        temp.payment_data = payment_data
        const packageJson = ordersData[i].packages.map(pack => JSON.parse(pack))
        let package_data = []
        for(let j=0;j<packageJson?.length; j++){
          let pack_map_id = packageJson[j]?.ticket_pack_map_id
          if(!pack_map_id){
            pack_map_id = packageJson[j]?.ticket_mapping_id
          }
          if(!pack_map_id){
            continue
          }
          let packages = 
            await ticketParamMap.findById({_id:pack_map_id})
            .populate([
              {
                path: "ticket_param",
                model: "ticket_params",
              },
              {
                path: "package_map",
                model: "package_map",
                populate: [
                  {
                    path: "package",
                    model: "packages",
                  },
                  { path: "param", model: "package_params" },
                ],
              },
            ])
            .lean()
          // let quantity = {quantity: packageJson[j].qty}
          package_data.push({packages, quantity: packageJson[j].qty });
        }
        temp.package_data = package_data
        temp._id = ordersData[i]._id.toString()
        temp.createdAt = ordersData[i].createdAt

        payload.push(temp)
      }

      return {
        total_records: _count,
        totalPages: Math.ceil(_count / process.env.PAGE_SIZE),
        recordPerPage: parseInt(process.env.PAGE_SIZE),
        currentPage: page,
        _payload: payload
      };

    }
    throw new Error("Ticket orders model error!")
  } catch(err){
    console.log(err)
    throw err
  }
}

//utils 
const getPartnerByPartnerId = async ({ id }) => {
  try {
    return (await Utils.contactSystem("get", "/system/partners/" + id)).data
  } catch (err) {
    if(err?.response?.data){
      throw new Error(err.response.data)
    }
    throw err;
  }
};

export { getPartnerInfo, getUserInfo, createVendorCustomer, getRoles, updatePartnerProfile, getCustomerSuggesions, getTicketOrderInfo };
