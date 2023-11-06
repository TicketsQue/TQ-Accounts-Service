import Log from "./log.js";
import axios from 'axios';

/**
 * 
 * @author          Sark
 * @version         1.0.0
 * @description     Helper module for sending api response
 * 
 */
export default class Utils {

    /**
     * 
     * @param {*} _partnerId 
     * @returns      
     * 
     */
    static getPartner = async (_partnerId) => {

        try {            
            return await Utils.contactSystem("get", ("/system/partners/"+ _partnerId));
        } catch (_e) {
            throw _e;
        }

    }

    static getPartners = async (_partnerIds) => {

        try {            
            return await Utils.contactSystem("get", ("/system/partners?ids="+ _partnerIds));
        } catch (_e) {
            throw _e;
        }

    }

    static checkPartner = async (_email, _phone) => {

        try {            
            return await Utils.contactSystem("get", ("/system/partners/lookup?email="+ _email +"&mobile="+ _phone));
        } catch (_e) {
            throw _e;
        }

    }

    static getRole = async (_roleId) => {

        try {            
            return await Utils.contactSystem("get", ("/system/roles/"+ _roleId));
        } catch (_e) {
            throw _e;
        }

    }

    static getContact = async (_partnerId) => {

        try {            
            return await Utils.contactSystem("get", ("/partners/"+ _partnerId +"/contacts"));
        } catch (_e) {
            throw _e;
        }

    }

    static createPartner = async (_partner) => {

        try {            
            return await Utils.contactSystem("post", "/system/partners", _partner);
        } catch (_e) {
            throw _e;
        }

    }

    static checkCustomerAssociation = async (_vendorId, _customerId, _associate = "NO") => {

        try {
            return await Utils.contactSystem("get", "/system/partners/"+ _vendorId +"/association?customer="+ _customerId +"&associate="+ _associate);
        } catch (_e) {
            throw _e;
        }

    }

    static contactSystem = async (_method, _path, _payload = null) => {

        try {

            let config = {
                method: _method,
                url: _path,
                baseURL: process.env.SYSTEM_SERVER
            }

            if (_payload) {
                config["data"] = _payload;
            }

            return await axios(config);


        } catch (_e) {
            throw _e;
        }

    }

    static handleError = (_e, _res) => {

        Log.log(_e.stack, Log.TYPE.TRACE);

        _res.status(500);
        _res.setHeader('content-type', 'text/plain');
        _res.send(_e.message);
        
    }

    static response = (_totalRecords, _currentPage, _records) => {

        return {
            totalRecords: _totalRecords,
            totalPages: Math.ceil(_totalRecords / process.env.PAGE_SIZE),
            recordPerPage: process.env.PAGE_SIZE,
            currentPage: _currentPage,
            payload: _records
        }

    } 

}