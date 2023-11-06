import mongoose from "mongoose";

/**
 * 
 * @author          Sark
 * @version         1.0.0
 * @description     Responsible for establishing connection with configured mongo db instance
 *                  This connection will happens at the time of server startup, 
 *                  After that you don't need to interact with db directly
 * 
 */
class DbManager {

    constructor() {

        this.db = null;          
        /* Holds the db serverc last error message */
        this.errorMessage = null;        
        /* Holds the reconnected count */
        this.reconnectCount = 0;
        /* Holds the disconnected count */
        this.disconnectedCount = 0;

        this.options = {
            useNewUrlParser: true,
            useUnifiedTopology: true
        };

        /* Holds the active connection */
        this.connections = {};

    }

    iniDBConnections = async () => {

        try {
        
            /* Init system DB connection */
            await this.createConnection(process.env.SYSTEM_MONGO_HOST, process.env.SYSTEM_MONGO_PORT, process.env.SYSTEM_MONGO_DB);
            /* Init event DB connection */
            await this.createConnection(process.env.EVENT_MONGO_HOST, process.env.EVENT_MONGO_PORT, process.env.EVENT_MONGO_DB);
            /* Init ticket DB connection */
            //await this.createConnection(process.env.SYSTEM_MONGO_HOST, process.env.SYSTEM_MONGO_PORT, process.env.SYSTEM_MONGO_DB);

        } catch (_e) {
            console.error(_e.stack);
            throw new Error(_e.message ? _e.message : "DB connection error");
        }

    }

    createConnection = async (_dbHost, _dbPort, _dbName) => {

        const ConnOptions = {
            autoIndex: false,
            maxPoolSize: 15,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            useNewUrlParser: true, 
            useUnifiedTopology: true
        };

        let dbDetails = null;
        /* Construct the connection url */
        const dbHost = "mongodb://"+ _dbHost +":"+ _dbPort +"/"+ _dbName;

        try {
            
            /* Try to create a connection with db host */
            const _connection = await mongoose.createConnection(dbHost, ConnOptions);
        
            // Store the connection in the cache
            dbDetails = {    
                models: {},             
                schemas: {},                 
                connection: _connection 
            };            
            
        } catch (_e) {
            console.error(_e.stack);
            throw new Error(_e.message ? _e.message : "DB connection error");
        }

        console.log("Connection estabilished succesfully to db : "+ _dbName);
        /* Store the connection details for later re use */
        this.connections[_dbName] = dbDetails;

        return this.connections[_dbName];

    }

    setSchema = (_dbName, _schemaName, _schema) => {
        if (this.connections[_dbName]) {            
            this.connections[_dbName].schemas[_schemaName] = _schema;
        }
    }

    setModel = (_dbName, _modelName, _model) => {        
        if (this.connections[_dbName]) {
            this.connections[_dbName].models[_modelName] = _model;    
        }
    }

    removeModel = (_dbName, _modelName) => {
        if (this.connections[_dbName] && this.connections[_dbName].models && this.connections[_dbName].models[_modelName]) {
            delete this.connections[_dbName].models[_modelName];    
        }
    }

}

const DBM = new DbManager();
export default DBM;