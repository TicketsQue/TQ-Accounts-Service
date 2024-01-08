
const getTicketTemplate = (eventData, vendorData, customerData) => ({
  "messaging_product": "whatsapp",
  "to": `${customerData?.customerCountryCode}${customerData?.customerNumber}`,
  "type": "template",
  "template": {
    "name": "send_continue_booking",
    "components": [
      {
        "type": "HEADER",
        "parameters": [
          {
            "type": "image",
            "image": {
              "link": eventData?.eventImage
            }
          }
        ]
      },
      {
        "type": "BODY",
        "parameters": [
          {
            "type": "text",
            "text": customerData?.customerName
          },
          {
            "type": "text",
            "text": vendorData?.vendorName
          },
          {
            "type": "text",
            "text": eventData?.eventName
          }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": 0,
        "parameters": [
          {
            "type": "TEXT",
            "text": `event-details/${eventData?.eventHandle}`
          }
        ]
      }
    ],
    "language": {
      "code": "en_US"
    }
  }
});

const getSendContinueVendorTemplate = (customerData, vendorData) => ({
  "messaging_product": "whatsapp",
  "to": `${customerData?.customerCountryCode}${customerData?.customerNumber}`,
  "type": "template",
  "template": {
    "name": "send_continue_booking_vendor",
    "components": [
      {
        "type": "BODY",
        "parameters": [
          {
            "type": "text",
            "text": customerData?.customerName
          },
          {
            "type": "text",
            "text": vendorData?.vendorName
          },
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": 0,
        "parameters": [
          {
            "type": "TEXT",
            "text": `events/${vendorData?.vendorShortName}`
          }
        ]
      }
    ],
    "language": {
      "code": "en_US"
    }
  }
});

export { getTicketTemplate, getSendContinueVendorTemplate };
