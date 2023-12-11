import axios from "axios";
import { checkUser, customerSignIn, getPartner, getPartnerType } from "./customer.js";
import { getUserInfo } from "./info.js";
import { capitalize } from "../utils/strings.js";

const getToken = async ({ mobile }) => {
  try {
    const user = await axios.post(
      `${process.env.SYSTEM_SERVER}/system/users/get-token`,
      {
        mobile,
        passcode: process.env.PASSCODE,
      }
    );
    return user.data;
  } catch (err) {
    throw err;
  }
};

const signinWithPhp = async (creds, _res) => {
  let php = null;
  let node = null;
  try {
    let data = new FormData();
    data.append("phone", creds?.phone);
    let config = null;
    if (creds?.password) {
      data.append("password", creds?.password);
      config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://ticket.yuktatech.com/api/app/logins",
        data: data,
      };
    } else {
      data.append("code", creds?.otp);
      config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://ticket.yuktatech.com/api/app/otplogin",
        data: data,
      };
    }

    const php_response = await axios.request(config);

    if (php_response?.data?.errors) {
      throw new Error(php_response.data.message);
    } else {
      php = php_response.data;
    }

    let user = await getToken({ mobile: creds?.phone });
    await axios.post(
      `${process.env.GATEWAY_SERVER}/gateway/user/session`,
      user?.payload
    );
    delete user.otp
    node = user.payload;

    return { php, node };
  } catch (error) {
    if (php) {
      return { php, node: { errors: true, message: error.response.data } };
    }
    if (creds?.phone && creds?.otp) {
      try {
        const user = await customerSignIn({
          mobile: creds?.phone,
          otp: creds?.otp,
        });
        await axios.post(
          `${process.env.GATEWAY_SERVER}/gateway/user/session`,
          user?.payload
        );
        return { node: user?.payload };
      } catch (error) {
        throw error;
      }
    }
    throw error;
  }
};

const otpWithPhp = async (creds) => {
  try {
    let data = new FormData();
    data.append("phone", creds?.phone);
    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://ticket.yuktatech.com/api/app/otp",
      data: data,
    };
    const response = await axios.request(config);
    delete response.data.otp
    return response.data;
  } catch (error) {
    try {
      const user = await staffCheckUser({ mobile: creds?.phone });
      if (user.payload.role === "Customer") {
        throw new Error("Access denied");
      }
      return user;
    } catch (error) {
      throw error;
    }
  }
};

const addStaff = async (_req) => {
  try {
    //URL 'SYSTEM_SERVER' for the system service is added in .env
    const {mobile} = _req.body.user
    if(!mobile){
      throw new Error("Invalid request")
    }
    const partnerInfo = await getPartner({mobile: mobile})

    if(partnerInfo.length>0){
      for(let i=0;i<partnerInfo.length;i++){
        // const partnerType = await getPartnerType({_id: partnerInfo[i].partner_type})
        if(partnerInfo[i].partner_type.handle === 'user'){
          throw new Error("Partner already registered, Please login to dashboard")
        }
      }
    }
    _req.body.name = capitalize(_req.body.name)
    const response = await axios.post(
      `${process.env.SYSTEM_SERVER}/system/partners/staff-onboard`,
      _req.body
    );
    return response.data;
  } catch (errors) {
    if(errors.response?.data){
      throw new Error(errors.response.data)
    }
    throw errors;
  }
};

const updateStaff = async (_req) => {
  try {
    // get partner and check the role
    if(!_req.headers.user){
      throw new Error("Invalid Request")
    }
    const partnerUpdateCurrent = await getUserInfo({_id: _req.params.id})
    if(partnerUpdateCurrent.role.handle === "admin" && _req.headers.user !== _req.params.id){
      throw new Error("Cannot edit admin details")
    }
    if(partnerUpdateCurrent.role.handle === "admin" && partnerUpdateCurrent.role._id !== _req.body.role) {
      throw new Error("Cannot change admin role")
    }
    // check if mobile numbile number already exists for  any staff
    // _req.params.vendor = partnerUpdateCurrent.vendor._id.toString()
    // const staffList = await getStaff(_req)
    // staffList.payload.forEach((staff) => {
    //   if(staff.mobile === _req.body.mobile){
    //     throw new Error("Mobile number already exists")
    //   }
    // })

    //check if staff alread exists
    const staffList = await getPartner({mobile: _req.body.mobile})
    const userData = await getUserInfo({_id: _req.params.id})
    staffList.forEach((user) => {
      if((user.partner_type?.handle === 'user') && (user.mobile === _req.body.mobile) && (user._id !== userData.partner._id)){
        throw new Error("staff already exists")
      }
    })
    //URL 'SYSTEM_SERVER' for the system service is added in .env
    _req.body.name = capitalize(_req.body.name)
    console.log(_req.body.name)
    const response = await axios.put(
      `${process.env.SYSTEM_SERVER}/system/users/${_req.params.id}`,
      _req.body
    );
    return response.data;
  } catch (errors) {
    throw errors;
  }
};

const getStaff = async (_req) => {
  try {
    //URL 'SYSTEM_SERVER' for the system service is added in .env
    const response = await axios.get(
      `${process.env.SYSTEM_SERVER}/system/partners/${_req.params.vendor}/employees`,
        { params: { search: _req.query.search || "", page: _req.query.page || 0 } }
    );
    const staffList = response.data
    const staffListUpdated = staffList.payload.map((staff) => {
      staff.user = staff.user.map((user) => {
        const {password, otp, ...fields} = user
        return fields
      })
      return staff
    })
    staffList.payload = staffListUpdated
    return staffList
  } catch (errors) {
    throw errors;
  }
};

const staffCheckUser = async ({ mobile }) => {
  try {
    const response = await axios.get(
      //System service URL
      `${process.env.SYSTEM_SERVER}/system/users/check?user=${mobile}`,
    );
    return response.data;
  } catch (err) {
    throw err;
  }
};

export { signinWithPhp, otpWithPhp, addStaff, getStaff, updateStaff };
