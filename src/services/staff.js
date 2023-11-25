import axios from "axios";
import { checkUser, customerSignIn, getPartner, getPartnerType } from "./customer.js";

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
    return response.data;
  } catch (error) {
    try {
      const user = await checkUser({ mobile: creds?.phone });
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
        const partnerType = await getPartnerType({_id: partnerInfo[i].partner_type})
        if(partnerType.handle === 'user'){
          throw new Error("Partner already registered, Please login to dashboard")
        }
      }
    }
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
    //URL 'SYSTEM_SERVER' for the system service is added in .env
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
    return response.data;
  } catch (errors) {
    throw errors;
  }
};

export { signinWithPhp, otpWithPhp, addStaff, getStaff, updateStaff };
