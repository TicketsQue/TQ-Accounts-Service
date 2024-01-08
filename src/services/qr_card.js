import EM from "../utils/entity.js";
import { getPartner } from "./customer.js";
import { getPartnerByPartnerId } from "./info.js";

// only for seld registration as of now
const registerCardToCustomer = async ({ qr_token, customer }) => {
    try {
        const qrModel = await EM.getModel("ticketsDB", "qr_cards")
        const qrCardData = await qrModel.findOne({ qr_token: qr_token })
        // add constrainsts to check the status of the qr card
        if (!qrCardData) {
            throw new Error("Card not found")
        }
        let currentCardStatus = getQrCardStatus(qrCardData?.card_status)
        console.log(currentCardStatus)
        if (currentCardStatus?.customer_registered && qrCardData?.customer !== customer) {
            throw new Error("Card is already registered")
        }
        if (!currentCardStatus?.card_status) {
            throw new Error("Card is disabled")
        }
        if (!currentCardStatus?.vendor_enabled) {
            throw new Error("Vendor has disabled the card")
        }
        if (!currentCardStatus?.self_registration) {
            throw new Error("Self registration is disabled, please contact promoter")
        }
        // validated so associate card to customer
        //also need to update the card_status
        currentCardStatus.customer_registered = true
        const updatedCardStatusCode = getQrCardStatusNumber(currentCardStatus)
        await qrModel.findByIdAndUpdate({ _id: qrCardData?._id?.toString() }, { customer: customer, card_status: updatedCardStatusCode })
        return { result: "Card registered to customer" }
    } catch (err) {
        throw err
    }
}

const getQrCardBasicData = async ({ qr_token, user }) => {
    try {
        if (!qr_token) {
            throw new Error("Invalid request")
        }
        const qrModel = await EM.getModel("ticketsDB", "qr_cards")
        let qrCardData = await qrModel.findOne({ qr_token: qr_token })
        if (!qrCardData) {
            qrCardData = await qrModel.findOne({ qr_tracking_id: qr_token })
            if (!qrCardData) {
                throw new Error("Invalid QR Card")
            }
        }
        const cardStatus = getQrCardStatus(qrCardData?.card_status)
        let customerData = null
        if (qrCardData?.customer) {
            customerData = await getPartnerByPartnerId({ id: qrCardData?.customer })
        }
        return {
            qr_token: qrCardData?.qr_token,
            qr_tracking_id: qrCardData?.qr_tracking_id,
            serial_number: qrCardData?.serial_number,
            qr_type: qrCardData?.qr_type,
            card_status: cardStatus,
            customer: customerData,
            createdAt: qrCardData?.createdAt,
        }
    } catch (err) {
        throw err
    }
}

// Utility function to convert status to int and int to status

const getQrCardStatus = (code) => {
    // Ensure the input is a non-negative integer
    if (typeof code !== 'number' || code < 0 || !Number.isInteger(code)) {
        throw new Error('Input must be a non-negative integer.');
    }

    // Convert the code to binary and pad with leading zeros to ensure it's 4 bits
    const binaryStatus = (code >>> 0).toString(2).padStart(4, '0');

    // Create an object to represent the status of each bit
    const status = {
        card_status: parseInt(binaryStatus.charAt(0)) === 1,
        vendor_enabled: parseInt(binaryStatus.charAt(1)) === 1,
        self_registration: parseInt(binaryStatus.charAt(2)) === 1,
        customer_registered: parseInt(binaryStatus.charAt(3)) === 1,
    };

    return status;
}

const getQrCardStatusNumber = (status) => {
    // Ensure the input is an object with the expected properties
    if (
        typeof status !== 'object' ||
        status === null ||
        !status.hasOwnProperty('card_status') ||
        !status.hasOwnProperty('vendor_enabled') ||
        !status.hasOwnProperty('self_registration') ||
        !status.hasOwnProperty('customer_registered')
    ) {
        throw new Error('Input must be an object with properties card_status, vendor_enabled, self_registration, and customer_registered.');
    }

    // Convert the status object to a binary string
    const binaryString =
        (status.card_status ? '1' : '0') +
        (status.vendor_enabled ? '1' : '0') +
        (status.self_registration ? '1' : '0') +
        (status.customer_registered ? '1' : '0');

    // Convert the binary string to an integer
    const number = parseInt(binaryString, 2);

    return number;
}


export {
    registerCardToCustomer,
    getQrCardBasicData
}
