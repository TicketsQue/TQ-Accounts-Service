/**
 * 
 * @author          Sark
 * @version         1.0.0
 * @description     Responsible for sending the logs to log server
 * 
 */
export default class Log {

    constructor() {

        if (!Log.instance) {            
            Log.instance = this;
        }
  
        return Log.instance;

    }

    static TYPE = {
        MESSAGE: 1,
        WARNING: 2,
        ERROR: 3,
        TRACE: 4
    }

    static log = (_message, _type) => {
        console.log(_message);
    }

    static activity = (_message) => {
        console.log(_message);
    }

}