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
    if (err.response?.data) {
      throw new Error(err.response?.data)
    }
    throw err;
  }
};

const createVendorCustomer = async (_req) => {
  try {
    const { mobile, email, name, country_code, partner_info } = _req.body;
    const user = _req.headers.user
    let vendor_id = _req.headers.vendor    
    if (partner_info) {
      const updatedPartnerData = await updateCustomer({ name: name, mobile: mobile, email: email, country_code: country_code, partner: partner_info })
      return updatedPartnerData;
    }
    const customerCreateRes = await createUser({ name, email, mobile, country_code });
    if(vendor_id){
      await axios.get(`${process.env.SYSTEM_SERVER}/system/partners/${vendor_id}/association`, {
        params: {
          customer: customerCreateRes?._id,
          associate: "YES"
        }
      })
    }
    return customerCreateRes;
  } catch (err) {
    if (err.response?.data?.startsWith("Partner validation failed")) {
      throw new Error("Invalid request, fields missmatch")
    }
    if (err.response?.data) {
      throw new Error(err.response.data)
    }
    throw err;
  }
};

const getCustomerSuggesions = async (_req) => {
  try {
    const { user } = _req.headers
    const mobile = _req.query.mobile || null
    if (!user) {
      throw new Error("Invalid request")
    }
    const userData = await getUserInfo({ _id: user })
    const vendor = userData?.vendor?._id
    const vendorCustomersList = await axios.get(`${process.env.SYSTEM_SERVER}/system/partners/${vendor}/customers`,
      {
        params: _req.query,
      }
    )
    if (!mobile) {
      return vendorCustomersList.data
    }
    //filter according to mobile number
    const customerData = vendorCustomersList.data.allCustomers.find(data => data.customer?.mobile === mobile)
    if (!customerData) {
      throw new Error("Customer not found")
    }
    const customer = customerData.customer
    return {
      payload: {
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email
      }
    }

  } catch (err) {
    if (err.response?.data) {
      throw new Error(err.response.data)
    }
    throw err
  }
}

const updatePartnerProfile = async (_req) => {
  try {
    const userProfileImg = _req.files['profile_img']
    const user = _req.headers.user
    const name = capitalize(_req.body.name)
    const mobile = _req.body.mobile
    const email = _req.body.email
    const countryCode = _req.body.country_code
    if (!(user)) {
      throw new Error(`Invalid request`)
    }
    const updateData = {}
    if (name) {
      updateData.name = name
    }
    if (email) {
      updateData.email = email
    }
    if (countryCode) {
      updateData.country_code = countryCode
    }
    const userDate = await getUserInfo({ _id: user })
    if (userProfileImg && userProfileImg?.length === 1) {
      const imgData = await uploadToS3({ file: userProfileImg[0], vendorID: userDate?.vendor?._id, userID: user, })
      updateData.profile_img = imgData.object_key
    }
    const updateResponse = await axios.put(
      `${process.env.SYSTEM_SERVER}/system/users/${user}`,
      updateData
    );
    return updateResponse.data
  } catch (err) {
    if (err.response?.data) {
      throw new Error(err.response?.data)
    }
    throw err
  }
}

//ticket orders info
const getTicketOrderInfo = async (_req) => {
  try {
    const user = _req.headers.user
    if (!user) {
      throw new Error("Unauthorized request")
    }
    const showSuccess = _req.query.success === "true" ? true : false
    const ticketOrders = await EM.getModel("ticketsDB", "ticket_orders")
    const eventModel = await EM.getModel("eventsDB", "events");
    const ticketParamMap = await EM.getModel("ticketsDB", "ticket_param_mapping");
    const search = _req.query.search ? _req.query.search : null;
    const pageSize = parseInt(_req.query.page_size) || parseInt(process.env.PAGE_SIZE)
    const page = parseInt(_req.query.page) || 0;
    const skip = page * pageSize;
    const limit = pageSize;
    const currentUser = await getUserInfo({ _id: user })
    const vendor = _req.query.vendor ? true : false
    // const vendor_id = _req.query.vendor_id
    if (!(currentUser.role.handle === "sub-admin" || currentUser.role.handle === "admin" || currentUser.role.handle === "system")) {
      throw new Error("Access Denied")
    }
    const successTicketOrders = await ticketOrders.find({ user_id: null, payment_status: "PAYMENT_SUCCESS" })
    const successMobileNumbers = successTicketOrders.map(order => order.customer_mobile)
    const testersMobileNumbers = ["7899020430", "8147113798", "8861278272", "8088020619", "9740452978", "7204357841", "9353478074", "9741536152", "9972538979", "7483626790", "9964533375", "8970063505"]
    if (ticketOrders) {
      let findConfig = {
        user_id: null,
        vendor: { $ne: "656c73b0cb27bc8c6241e70c" },
        customer_mobile: { $nin: Array.from(new Set(successMobileNumbers.concat(testersMobileNumbers))) }
      }
      if (showSuccess) {
        findConfig.payment_status = "PAYMENT_SUCCESS"
        findConfig.customer_mobile = { $nin: Array.from(new Set(testersMobileNumbers)) }
      } else {
        findConfig.payment_status = { $ne: "PAYMENT_SUCCESS" }
      }
      // if(vendor_id){
      //   findConfig.vendor = vendor_id
      // }
      // old config
      // const findConfig = {user_id: null, payment_status:{$ne:"PAYMENT_SUCCESS"}, vendor: {$ne:"656c73b0cb27bc8c6241e70c"}}
      let searchConfig = []
      if (search) {
        searchConfig.push({ "customer_name": { $regex: new RegExp(search, "i") } })
        searchConfig.push({ "customer_mobile": { $regex: new RegExp(search, "i") } })
        searchConfig.push({ "ticket_tracking_id": { $regex: new RegExp(search, "i") } })
      }
      if (vendor) {
        if (currentUser.role.handle === "system") {
          findConfig.vendor = _req.query.vendor
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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

      let payload = []
      for (let i = 0; i < ordersData?.length; i++) {
        let temp = {}
        let customer_data = await getPartnerByPartnerId({ id: ordersData[i].customer_id })
        if (!customer_data) {
          try {
            customer_data = (await getUserInfo({ _id: ordersData[i].customer_id })).partner
          }
          catch (err) {
            if (err?.message === "User not found") {
              customer_data = null
            } else {
              console.log(err)
            }
          }
        }
        let ticket_data = {}
        if (ordersData?.tickset_status) {
          ticket_data.ticket_id = ordersData?.ticket_tracking_id
          ticket_data.qr_token = ordersData?.qr_token
        }
        temp.customer_data = customer_data
        let event_data = await eventModel.findOne({ _id: ordersData[i].association }).lean()
        temp.event_data = event_data
        let vendor_data = await getPartnerByPartnerId({ id: ordersData[i].vendor })
        temp.vendor_data = vendor_data
        let payment_data = {}
        payment_data.total_price = ordersData[i]?.total_price
        payment_data.platform_fee = ordersData[i]?.platform_fee
        payment_data.gst_fee = ordersData[i]?.gst_fee
        payment_data.payment_status = ordersData[i]?.payment_status
        temp.payment_data = payment_data
        const packageJson = ordersData[i].packages.map(pack => JSON.parse(pack))
        let package_data = []
        for (let j = 0; j < packageJson?.length; j++) {
          let pack_map_id = packageJson[j]?.ticket_pack_map_id
          if (!pack_map_id) {
            pack_map_id = packageJson[j]?.ticket_mapping_id
          }
          if (!pack_map_id) {
            continue
          }
          let packages =
            await ticketParamMap.findById({ _id: pack_map_id })
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
          package_data.push({ packages, quantity: packageJson[j].qty });
        }
        temp.package_data = package_data
        temp._id = ordersData[i]._id.toString()
        temp.createdAt = ordersData[i].createdAt
        temp.ticket_data = ticket_data

        payload.push(temp)
      }

      return {
        total_records: _count,
        totalPages: Math.ceil(_count / pageSize),
        recordPerPage: pageSize,
        currentPage: page,
        _payload: payload
      };

    }
    throw new Error("Ticket orders model error!")
  } catch (err) {
    console.log(err)
    throw err
  }
}

/* Super admin apis */
// get vendor ticket data
const getAllTickets = async (_req) => {
  try {
    const search = _req.query.search ? _req.query.search : null;
    const pageSize = parseInt(_req.query.page_size) || parseInt(process.env.PAGE_SIZE)
    const page = search ? 0 : parseInt(_req.query.page) || 0;
    const skip = page * pageSize;
    const limit = pageSize;
    const user = _req.headers.user
    const eventModel = await EM.getModel("eventsDB", "events");
    const ticketOrders = await EM.getModel("ticketsDB", "ticket_orders")
    const ticketCancellationModel = await EM.getModel("ticketsDB", "ticket_cancellations")

    if (!user) {
      throw new Error("Access denied user not found")
    }
    const currentUser = await getUserInfo({ _id: user })
    if (!currentUser || currentUser.role.handle !== "system") {
      throw new Error("Access denied, only system users can access this API")
    }
    // filter query params
    const { from_date, till_date, purchase_mode, from_price, till_price, from_ppl_count, till_ppl_count, vendor, ticket_status } = _req.query
    // sort fields and order
    const sortQueryParam = _req.query.sort;
    const testersMobileNumbers = ["7899020430", "8147113798", "8861278272", "8088020619", "9740452978", "9972538979", "7204357841", "9353478074", "9741536152", "7483626790", "9964533375", "8970063505"]
    const findConfig = {
      $or: [{ ticket_status: true }, {
        $and: [
          {
            $or: [
              { payment_status: "true" },
              { payment_status: "PAYMENT_SUCCESS" }
            ]
          },
          { ticket_status: false }
        ]
      }],
      customer_mobile: { $nin: Array.from(new Set(testersMobileNumbers)) },
      vendor: { $ne: "656c73b0cb27bc8c6241e70c" },
    }
    let searchConfig = []
    if (search) {
      searchConfig.push({ "customer_name": { $regex: new RegExp(search, "i") } })
      searchConfig.push({ "customer_mobile": { $regex: new RegExp(search, "i") } })
      searchConfig.push({ "ticket_tracking_id": { $regex: new RegExp(search, "i") } })
    }
    let query = { ...findConfig };

    if (searchConfig.length > 0) {
      query = {
        $and: [findConfig, { $or: searchConfig }],
      };
    }
    // let query = {}
    let defaultSortConfig = {
      createdAt: -1
    }

    let sortConfig = null;
    if (sortQueryParam) {
      const sortFields = sortQueryParam.split(',');

      sortConfig = sortFields.reduce((acc, field) => {
        const [fieldName, sortOrder] = field.split(':');
        acc[fieldName] = sortOrder === 'dsc' ? -1 : 1;
        return acc;
      }, {});
    }
    if (from_date && till_date) {
      query.ticket_timestamp = {
        $gte: from_date,
        $lte: till_date
      };
    }
    if (from_price && till_price) {
      query.total_price = {
        $gte: from_price,
        $lte: till_price
      }
    }
    if ((from_ppl_count && !isNaN(from_ppl_count)) && (till_ppl_count && !isNaN(till_ppl_count))) {
      query.total_pax = {
        $gte: parseInt(from_ppl_count),
        $lte: parseInt(till_ppl_count)
      }
    }
    // vendor and ticket status filtering
    if (vendor) {
      let vendorList = vendor?.split(",")
      if (vendorList?.length > 0) {
        query.vendor = { $in: vendorList }
      }
    }
    // online offline
    if (purchase_mode === "online") {
      query.user_id = { $eq: null }
    }
    if (purchase_mode === "offline") {
      query.user_id = { $ne: null }
    }
    if (ticket_status) {
      query.ticket_status = { $eq: ticket_status === "true" ? true : false }
    }
    let vendorTicketCounts = {}
    let ticketOrdersCount = await ticketOrders.find(query)
    .sort(sortConfig || defaultSortConfig).populate({
      path: 'tickets',
      populate: {
        path: 'ticket_param_mapping',
        populate: [
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
        ],
      },
    })
    for(let i=0;i<ticketOrdersCount?.length;i++){
      // calculate vendor ticket counts
      if(!vendorTicketCounts[ticketOrdersCount[i].vendor]){
        vendorTicketCounts[ticketOrdersCount[i].vendor] = {"total_ticket_sales":ticketOrdersCount[i].total_price, "total_platform_fee":ticketOrdersCount[i].platform_fee, "total_gst_fee":ticketOrdersCount[i].gst_fee, "online_tickets_count":ticketOrdersCount[i]?.user_id ? 0 : 1, "offline_tickets_count":ticketOrdersCount[i]?.user_id ? 1 : 0, "offline_head_count": 0, "online_head_count": 0} 
      } else {
        vendorTicketCounts[ticketOrdersCount[i].vendor]["total_ticket_sales"] += ticketOrdersCount[i].total_price
        vendorTicketCounts[ticketOrdersCount[i].vendor]["total_platform_fee"] += Math.floor(ticketOrdersCount[i].platform_fee)
        vendorTicketCounts[ticketOrdersCount[i].vendor]["total_gst_fee"] += Math.floor(ticketOrdersCount[i].gst_fee)
        if(ticketOrdersCount[i]?.user_id !== null){
          vendorTicketCounts[ticketOrdersCount[i].vendor]["offline_tickets_count"] += 1
        } else {
          vendorTicketCounts[ticketOrdersCount[i].vendor]["online_tickets_count"] += 1
        }
      }
      const ticketFilteredData = ticketOrdersCount[i].tickets.forEach((ticket) => {
        const packageParsedData = JSON.parse(ticket.package_data)
        let purchase_mode = ticketOrdersCount[i].user_id ? "offline_head_count" : "online_head_count";
        if (ticketOrdersCount[i].ticket_status) {
          const packageName = ticketOrdersCount[i].vendor;
          const packageCount = vendorTicketCounts[packageName];

          // console.log(packageParsedData)
          const quantityToAdd = parseInt(ticket.quantity) * parseInt(packageParsedData?.package_map?.package?.pax)

          if (!packageCount) {
            // If the package name doesn't exist in vendorTicketCounts, create it.
            vendorTicketCounts[packageName] = { [purchase_mode]: quantityToAdd || 0};
          } else if (!packageCount[purchase_mode]) {
            // If the purchase_mode doesn't exist for the package, create it.
            packageCount[purchase_mode] = quantityToAdd;
          } else {
            // If both package name and purchase_mode exist, increment the value.
            packageCount[purchase_mode] += quantityToAdd;
          }
        }
      })
        
    }
    let _count = ticketOrdersCount?.length
    const ticketData = await ticketOrders.find(query)
      .sort(sortConfig || defaultSortConfig).populate({
        path: 'tickets',
        populate: {
          path: 'ticket_param_mapping',
          populate: [
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
          ],
        },
      }).skip(skip)
      .limit(limit)
      .lean();
    if (!ticketData) {
      throw new Error("event not found")
    }
    let finalFilter = []
    for (let i = 0; i < ticketData.length; i++) {
      const eventData = await eventModel.findById({ _id: ticketData[i].association })
      if (!eventData) {
        throw new Error("event not found")
      }
      let issuerData = null
      if (ticketData[i].user_id) {
        issuerData = await getUserInfo({ _id: ticketData[i].user_id })
      }
      const canelation = await ticketCancellationModel.findOne({ ticket_order_id: ticketData[i]._id })
      let canelation_data = null
      if (canelation) {
        canelation_data = {
          canceled_by: await getUserInfo({ _id: canelation?.user }),
          reason: canelation?.reason || null,
          canceled_at: canelation?.createdAt
        }
      }
      
      const customerData = await getPartnerByPartnerId({ id: ticketData[i].customer_id })
      const vendorShortName = await getVendorShortName({ vendorId: eventData.vendor })
      const vendorData = await getPartnerByPartnerId({id: ticketData[i].vendor})
      const ticketFilteredData = ticketData[i].tickets.map((ticket) => {
        const packageParsedData = JSON.parse(ticket.package_data)
        return {
          ticket_id: ticket._id,
          quantity: ticket.quantity,
          scan_count: ticket.scan_count,
          balance: ticket.balance,
          status: ticket.status,
          package_data: packageParsedData
        }
      })
      const filteredData = {
        ticket_token: ticketData[i].qr_token,
        event_tracking_id: eventData.tracking_id,
        vendor_name: vendorData?.name,
        vendor_short_name: vendorShortName,
        event_name: eventData?.name,
        status: ticketData[i].ticket_status,
        customer_email: customerData?.email,
        customer_id: ticketData[i].customer_id,
        customer_mobile: ticketData[i].customer_mobile,
        customer_name: ticketData[i].customer_name,
        price_data: {
          total_price: ticketData[i].total_price,
          platform_fee: ticketData[i].platform_fee,
          gst_fee: ticketData[i].gst_fee
        },
        total_ppl: ticketData[i].total_pax,
        payment_mode: ticketData[i].payment_mode,
        ticket_tracking_id: ticketData[i].ticket_tracking_id,
        ticket_created_at: ticketData[i].ticket_timestamp,
        purchase_mode: ticketData[i].user_id ? "Offline" : "Online",
        tickets_data: ticketFilteredData,
        user_data: issuerData,
        canelation_data: canelation_data,
        // vendor_tickets_data: vendorTicketCounts
      }
      if (purchase_mode && (filteredData.purchase_mode.toLocaleLowerCase() !== purchase_mode.toLocaleLowerCase())) {
        _count -= 1
        continue
      }
      finalFilter.push(filteredData)
    }
    return {
      total_records: _count,
      totalPages: Math.ceil(_count / pageSize),
      recordPerPage: pageSize,
      currentPage: page,
      _payload: finalFilter,
      vendor_counts: vendorTicketCounts
    };
  } catch (err) {
    throw err
  }
}

//super admin endpoint to get users who are mapped but no ticket orders created.
// get all customers who are mapped with vendors but have not created ticket order
// get all customers who are present in partner table but are not mapped with any vendor
// NOTE: exclude testing mobile numbers and 
/* Complicated to as  vendorcustomer and partner endpoints are in system DB*/
/**
 * steps
 * call system to fetch all vendor customer and partners
 * get all ticket orders and apply checks and send response
 */
// const getCustomerInfo = async(_req) => {

// }

// super admin dashboard data
const getTicketCounts = async (_req) => {
  try {
    const user = _req.headers.user
    const ticketOrders = await EM.getModel("ticketsDB", "ticket_orders")
    if (!user) {
      throw new Error("Access denied user not found")
    }
    const currentUser = await getUserInfo({ _id: user })
    if (!currentUser || currentUser.role.handle !== "system") {
      throw new Error("Access denied, only system users can access this API")
    }
    const testersMobileNumbers = ["7899020430", "8147113798", "8861278272", "8088020619", "9740452978", "7204357841", "9353478074", "9741536152", "9972538979", "7483626790", "9964533375", "8970063505"]
    const allTicketOrders = await ticketOrders.find({
    ticket_status: true, 
    customer_mobile: { $nin: Array.from(new Set(testersMobileNumbers))},
    vendor: { $ne: "656c73b0cb27bc8c6241e70c" }
   }).populate({
      path: 'tickets',
      populate: {
        path: 'ticket_param_mapping',
        populate: [
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
        ],
      },
    })

    let payload = {
      ticket_sales_online: 0,
      ticket_sales_offline: 0,
      platform_fee_total: 0,
      gst_fee_total: 0,
      total_online_headcount: 0,
      total_offline_headcount: 0,
      total_online_ticket_count: 0,
      total_offline_ticket_count: 0,
      total_tickets_count: allTicketOrders?.length
    }

    allTicketOrders?.forEach(ticketOrder => {
      // general data that doesn concern about online or offline
      payload.platform_fee_total += Math.floor(ticketOrder?.platform_fee)
      payload.gst_fee_total += Math.floor(ticketOrder?.gst_fee)
      if(ticketOrder?.user_id !== null){
        payload.total_offline_ticket_count += 1
        payload.ticket_sales_offline += parseInt(ticketOrder?.total_price)
      } else {
        payload.total_online_ticket_count += 1
        payload.ticket_sales_online += parseInt(ticketOrder?.total_price)
      }
      const ticketFilteredData = ticketOrder.tickets.map((ticket) => {
        const packageParsedData = JSON.parse(ticket.package_data)
        if (ticketOrder?.user_id !== null) {
          // offline tickets
          payload.total_offline_headcount += parseInt(ticket.quantity) * parseInt(packageParsedData?.package_map?.package?.pax)
        } else {
          // online tickets
          payload.total_online_headcount += parseInt(ticket.quantity) * parseInt(packageParsedData?.package_map?.package?.pax)
        }
      })


    })
    return payload

  } catch (err) {
    throw err
  }
}

const getAllCustomerData = async (_req) => {
  try{
    const pageSize = parseInt(_req.query.page_size) || parseInt(process.env.PAGE_SIZE)
    const page = parseInt(_req.query.page) || 0;
    let totalRecords = 0
    let totalPages
    let recordPerPage
    let currentPage
    const user = _req.headers.user
    const checkVendorMapping = _req.query.check_mapping === "true"?true:false
    const checkCustomerOrders = _req.query.check_order === "true"?true:false
    const eventModel = await EM.getModel("eventsDB", "events");
    const ticketOrders = await EM.getModel("ticketsDB", "ticket_orders")
    if (!user) {
      throw new Error("Access denied user not found")
    }
    const currentUser = await getUserInfo({ _id: user })
    if (!currentUser || currentUser.role.handle !== "system") {
      throw new Error("Access denied, only system users can access this API")
    }
    let payload = []
    
    // load all partners, base the pagination on partner table
    const partners_response = await Utils.contactSystem("get", `/system/partners?type=Customer&page=${page}&page_size=${pageSize}` )
    const partners = partners_response?.data?.payload
     totalRecords = partners_response?.data?.totalRecords
     totalPages = partners_response?.data?.totalPages
     recordPerPage = partners_response?.data?.recordPerPage
     currentPage = partners_response?.data?.currentPage
    // load all partner customer mapping
    const partnerCustomerMapping = await Utils.contactSystem("get", `/system/partners/customer/list`)
    const allPartnerCustomerMapping = partnerCustomerMapping?.data
    //loop through each partner and find if mapping is there and find if ticket order is there
    for(let i=0;i<partners?.length; i++){
      let temp = {}
      temp["customer_data"] = partners[i]
      // find if partner has partner mapping
      const mappedPartner =  allPartnerCustomerMapping.find(partnerCustMap => partnerCustMap?.customer?._id === partners[i]._id)
      const customerTicketOrders = await ticketOrders.find({customer_id: partners[i]?._id})
      // check partner mapping
      if(checkVendorMapping && !checkCustomerOrders){
        if(mappedPartner && customerTicketOrders?.length===0){
          temp["customer_mapped_partner"] = mappedPartner?.partner || null
          temp["customer_ticket_orders"] = customerTicketOrders?.length
          payload.push(temp)
          continue
        }
      }
      if(!checkVendorMapping && checkCustomerOrders){
        if(!mappedPartner && customerTicketOrders?.length > 0){
          temp["customer_mapped_partner"] = mappedPartner?.partner || null
          temp["customer_ticket_orders"] = customerTicketOrders?.length
          payload.push(temp)
        }
      }
      if(checkVendorMapping && checkCustomerOrders){
        // if(mappedPartner && customerTicketOrders?.length > 0 ){
          temp["customer_mapped_partner"] = mappedPartner?.partner || null
          temp["customer_ticket_orders"] = customerTicketOrders?.length
          payload.push(temp)
        // }
      }
      if(!checkCustomerOrders && !checkVendorMapping){
        if(!mappedPartner && customerTicketOrders?.length === 0){
          temp["customer_ticket_orders"] = customerTicketOrders?.length
          temp["customer_mapped_partner"] = mappedPartner?.partner || null
          payload.push(temp)
          continue
        }
      }
    }
    // no pagination required
    totalRecords = payload?.length
    return {
      total_records: totalRecords,
      // totalPages: totalPages,
      // recordPerPage: recordPerPage,
      // currentPage: currentPage,
      _payload: payload,
    };
  } catch(err){
    throw err
  }
}

//utils 
const getPartnerByPartnerId = async ({ id }) => {
  try {
    return (await Utils.contactSystem("get", "/system/partners/" + id)).data
  } catch (err) {
    if (err?.response?.data) {
      throw new Error(err.response.data)
    }
    throw err;
  }
};

const getVendorShortName = async ({ vendorId }) => {
  try {
    const vendorData = await axios.get(
      `${process.env.SYSTEM_SERVER}/system/partners`,
      {
        params: {
          ids: vendorId,
        },
      }
    );
    return vendorData.data.payload[0].vendor_short_name;
  } catch (err) {
    console.log(err.response.data);
    throw err;
  }
};

export { getPartnerInfo, getUserInfo, createVendorCustomer, getRoles, updatePartnerProfile, getCustomerSuggesions, getTicketOrderInfo, getAllTickets, getTicketCounts, getAllCustomerData };
