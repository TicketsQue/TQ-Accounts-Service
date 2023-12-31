import axios from "axios";
import { capitalize } from "../utils/strings.js";

/**
 * A function to create new customer using the system service
 * @param {Object} params Object that contains the custimer name, email and mobile
 * @returns {Express.Response}
 */

//handler method
const customerCreate = async ({ name, email, mobile, country_code, partner_info }) => {
  try {
    if (partner_info) {
      return await checkUser({ mobile: mobile });
    } else {
      if (!name) {
        throw new Error("User not found")
      }
      await createUser({ name: name, email: email, mobile: mobile, country_code: country_code });
      return await checkUser({ mobile: mobile });
    }
  } catch (err) {
    if (err.response?.data) {
      throw new Error(err.response.data)
    }
    throw err;
  }
};

//handler method
const customerSignInAndUpdate = async ({ name, email, user, country_code, otp, vendor_id }) => {
  try {
    const partnerInfo = await getPartner({ mobile: user });
    if (partnerInfo.length === 0) {
      throw new Error("user does not exist");
    }
    let partner = null
    for (let i = 0; i < partnerInfo.length; i++) {
      // const partnerType = await getPartnerType({_id: partnerInfo[i].partner_type}) //old logic
      if (partnerInfo[i].partner_type.handle === 'customer') {
        partner = partnerInfo[i]
        break
      }
    }
    if (!partner) {
      throw new Error("user does not exist");
    }
    const signInResponse = await customerSignIn({ mobile: user, otp: otp });
    if (signInResponse.payload) {
      await updateCustomer({
        name: name,
        email: email,
        mobile: user,
        country_code: country_code,
        partner: partner,
      });
    }
    if (vendor_id) {
      await axios.get(`${process.env.SYSTEM_SERVER}/system/partners/${vendor_id}/association`, {
        params: {
          customer: partner?._id,
          associate: "YES"
        }
      })
    }
    return signInResponse;
  } catch (err) {
    if (err?.response?.data) {
      console.log("System response")
      throw new Error(err?.response?.data)
    }
    throw err;
  }
};

// auth update handler // migrated to customer
// const customerAuthSignInUpdate = async ({ user, name, email }) => {
//   try {
//     const partner = await getPartner({ mobile: user });
//     if (!partner) {
//       const createCustomerResponse = await customerCreate({
//         name: name,
//         email: email,
//         mobile: user,
//       });
//       return createCustomerResponse;
//     }
//     const response = await updateCustomer({
//       name: name,
//       mobile: user,
//       email: email,
//       partner: partner,
//     });
//     return response;
//   } catch (err) {
//     throw err;
//   }
// };

/**
 * 
 * 
 The following code is utility functions that is being used by the handler functions above
 *
 *
 */

/**
 * A function to varify and send registered customers login OTP to the given mobile number
 * @param {Object} params Object with the mobileNumber of the customer to which number the OTP will be sent
 * @returns {Express.Response}
 */
const checkUser = async ({ mobile }) => {
  try {
    const response = await axios.get(
      //System service URL
      `${process.env.SYSTEM_SERVER}/system/users/check?user=${mobile}`,
      {
        headers: {
          'Origin': process.env.CUSTOMER_BASE_URL,
        }
      }
    );
    return response.data;
  } catch (err) {
    throw err;
  }
};

/**
 * Function to update customer(partner in db) details
 * @param {Object} param the object should contain the name, email and mobile of users and the partner object
 * @returns {Object} returns the updated field value
 */
const updateCustomer = async ({ name, email, mobile, country_code, partner }) => {
  try {
    // const partner = await getPartner({mobile: mobile}) // previous logic
    if (!partner) {
      throw new Error("user does not exist");
    }
    let updateBody = { status: true }
    if (name) {
      updateBody.name = capitalize(name)
    }
    if (email) {
      updateBody.email = email
    }
    if (mobile) {
      updateBody.mobile = mobile
    }
    if (country_code) {
      updateBody.country_code = country_code
    }
    const updateResponse = await axios.put(
      `${process.env.SYSTEM_SERVER}/system/partners/${partner._id}`,
      updateBody
    );
    return updateResponse.data;
  } catch (err) {
    if (err?.response?.data) {
      throw new Error(err?.response?.data)
    }
    throw err;
  }
};

/**
 * A function to create partners (users document needs to added in db)
 * @param {Object} param The object should contain the user name, email and mobile
 * @returns {Object} returns the created user(partner in db) field
 */
const createPartner = async ({ name, email, mobile, country_code }) => {
  try {
    const response = await axios.post(
      //System service URL
      `${process.env.SYSTEM_SERVER}/system/partners`,
      {
        //Objects passed to system service endpoint
        name: capitalize(name),
        email: email,
        mobile: mobile,
        country_code: country_code,
        status: true,
      }
    );
    return response;
  } catch (err) {
    throw err;
  }
};

/**
 * A function for users to sign in using OTP validation
 * @param {Object} param Object should contain the user mobile and user entered OTP for validation
 * @returns {Object} returns user details with JWT token on successfull sign in
 */
const customerSignIn = async ({ mobile, otp }) => {
  try {
    const signInResponse = await axios.post(
      `${process.env.SYSTEM_SERVER}/system/users/sign-in`,
      {
        user: mobile,
        otp: otp,
      },
      {
        headers: {
          'Origin': process.env.CUSTOMER_BASE_URL,
        }
      }
    );
    await axios.post(
      `${process.env.GATEWAY_SERVER}/gateway/user/session`,
      signInResponse.data.payload
    );

    return signInResponse.data;
  } catch (err) {
    throw err;
  }
};

/**
 * A simple function to get the customer role ID using the handle name
 * @returns {Object} Object wth all the role details
 */
const getCustomerRole = async () => {
  try {
    return await axios.get(
      `${process.env.SYSTEM_SERVER}/system/roles/customer`
    );
  } catch (err) {
    throw err;
  }
};

/**
 * A function to create user after creating partner of type customer
 * Uses the getCustomerRole() and createParner() functions to get the customer role ID and create partner
 * @param {Object} param An object with users name, email and mobile
 * @returns {Object} returns the user created
 */
const createUser = async ({ name, email, mobile, country_code }) => {
  try {
    let createBody = {}
    if (name) {
      createBody.name = name
    }
    if (email) {
      createBody.email = email
    }
    if (mobile) {
      createBody.mobile = mobile
    }
    if (country_code) {
      createBody.country_code = country_code
    }
    const customerRole = await getCustomerRole();
    const partner = await createPartner(createBody);
    const userData = await axios.post(
      `${process.env.SYSTEM_SERVER}/system/users`,
      {
        status: true,
        employee_code: "",
        employee_status: "active",
        role: customerRole.data._id,
        partner: partner.data._id,
        //default password is used, since customers can only login using OTP
        password: "123456",
        otp: "",
      }
    );

    return partner.data;
  } catch (err) {
    throw err;
  }
};

/**
 * A function that is used to fetch the partner details based on the given mobile number
 * @param {Object} param An object with user mobile number
 * @returns {Object} returns the partner related fields as an Object
 */
const getPartner = async ({ mobile }) => {
  try {
    const partner = await axios.get(
      `${process.env.SYSTEM_SERVER}/system/partners/lookup?mobile=${mobile}`,
      {
        params: {
          look_many: "true"
        }
      }
    );
    return partner.data;
  } catch (err) {
    throw err;
  }
};

const getPartnerType = async ({ _id }) => {
  try {
    const partnerType = await axios.get(
      `${process.env.SYSTEM_SERVER}/system/partner_types/${_id}`
    );
    return partnerType.data;
  } catch (err) {
    throw err;
  }
};

const getConstants = async () => {
  try {
    const response = await axios.get(`${process.env.SYSTEM_SERVER}/system/constants`)
    return response.data
  } catch (err) {
    throw err
  }
}

const getUserData = async ({ user_id }) => {
  try {
    const user = await axios.get(
      `${process.env.ACCOUNT_SERVER}/accounts_service/v1/info/user/${user_id}`
    );
    return user.data;
  } catch (err) {
    throw err;
  }
};

export {
  customerCreate,
  checkUser,
  customerSignIn,
  customerSignInAndUpdate,
  getPartner,
  createUser,
  getPartnerType,
  getConstants,
  updateCustomer,
};
