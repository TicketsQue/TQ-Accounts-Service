import dotenv from "dotenv";
dotenv.config();

import cache from "./cache.js";
import mongoose from "mongoose";
import DBM from "./db.js";

/**
 *
 * @author          Sark
 * @version         1.0.0
 * @description     Responsible for creating and maintaining mongoose models
 *                  This module also constantly in contact with system module
 *                  Will get the latest entity meta at real time
 *
 */
class EntityManager {
  constructor() {
    this.types = {
      1: "String",
      2: "Number",
      3: "Date",
      4: "Boolean",
      5: "ObjectId",
      6: "Array",
      7: "Mixed",
      8: "BigInt",
    };

    this.datasource = null;
  }

  isValidDate = (_dateStr) => {
    const date = new Date(_dateStr);
    return !isNaN(date.getTime());
  };

  createModel = async (_dbName, _collectionName, _fields) => {
    console.log(
      "createModel called for : " + _collectionName + ", on DB : " + _dbName
    );

    if (!DBM.connections[_dbName]) {
      throw new Error("No connection found for DB : " + _dbName);
    }

    this.datasource = DBM.connections[_dbName];
    this.datasource.connection.useDb(_dbName, this.getDbOption());

    if (this.datasource.models && this.datasource.models[_collectionName]) {
      return this.datasource.models[_collectionName];
    }

    let config = {};
    let options = {};
    const schemaFields = {};

    for (const field of _fields) {
      if (field.status) {
        /* Type */
        config = {
          type: this.types[field.type],
        };
        /* Check for the ObjectId type */
        if (this.types[field.type] === "ObjectId") {
          config["type"] = mongoose.Schema.Types.ObjectId;
        }

        /* Required */
        if (field.required) {
          config["required"] = field.required;
        }

        /* Default */
        if (field.default) {
          config["default"] = field.default;
        }

        /* Unique */
        if (field.unique) {
          config["unique"] = field.unique;
        }

        if (field.options) {
          try {
            options = JSON.parse(field.options);
            if (this.types[field.type] === "String") {
              if ("match" in options && options.match !== "") {
                config["match"] = options.match;
              }
              if ("trim" in options) {
                config["trim"] = options.trim;
              }
              if ("enum" in options && Array.isArray(options.enum)) {
                config["enum"] = options.enum;
              }
              if (
                "minLength" in options &&
                !Number.isNaN(options.minLength) &&
                parseFloat(options.minLength) >= 0
              ) {
                config["minLength"] = parseFloat(options.minLength);
              }
              if (
                "maxLength" in options &&
                !Number.isNaN(options.maxLength) &&
                parseFloat(options.maxLength) > 0
              ) {
                config["maxLength"] = parseFloat(options.maxLength);
              }
              if ("lowercase" in options) {
                config["lowercase"] = options.lowercase;
              }
              if ("uppercase" in options) {
                config["uppercase"] = options.uppercase;
              }
            } else if (this.types[field.type] === "Number") {
              if (
                "min" in options &&
                !Number.isNaN(options.min) &&
                parseFloat(options.min) >= 0
              ) {
                config["min"] = parseFloat(options.min);
              }
              if (
                "max" in options &&
                !Number.isNaN(options.max) &&
                parseFloat(options.max) > 0
              ) {
                config["max"] = parseFloat(options.max);
              }
            } else if (this.types[field.type] === "Date") {
              if ("min" in options && this.isValidDate(options.min)) {
                config["min"] = new Date(options.min);
              }
              if ("max" in options && this.isValidDate(options.max)) {
                config["max"] = new Date(options.max);
              }
            } else if (this.types[field.type] === "ObjectId") {
              const _entity = await this.getEntityHandle(
                _dbName,
                options.entity,
                _collectionName
              );
              if (_entity) {
                config["ref"] = _entity;
              }
            } else if (this.types[field.type] === "Array") {
              if (options.itemType === "ObjectId") {
                const _entity = await this.getEntityHandle(
                  _dbName,
                  options.itemTarget,
                  _collectionName
                );
                config["ref"] = _entity;
                config["type"] = mongoose.Schema.Types.ObjectId;
              } else {
                config["type"] = options.itemType;
              }

              config = [config];
            }
          } catch (_e) {
            console.log(_e);
            /* Ignore */
          }
        }

        /* Update default value for Boolean - since default is String type */
        if (
          this.types[field.type] === "Boolean" &&
          config["default"] &&
          typeof config["default"] === "string"
        ) {
          config["default"] = config["default"] === "true";
        }

        schemaFields[field.handle] = config;
      }
    }

    const schema = new mongoose.Schema(schemaFields, {
      strict: true,
      timestamps: true,
    });
    // Store the schema in the cache
    DBM.setSchema(_dbName, _collectionName + "Schema", schema);

    const entityModel = await this.datasource.connection.model(
      _collectionName,
      schema
    );
    // Store the model in the cache
    DBM.setModel(_dbName, _collectionName, entityModel);

    console.log("Return Model : " + _collectionName);

    return entityModel;
  };

  getModel = async (_dbName, _entity) => {
    if (_entity) {
      if (cache.hasEntity(_entity)) {
        const entity = cache.getEntity(_entity);

        if (Array.isArray(entity.fields) && entity.fields.length > 0) {
          return await this.createModel(_dbName, _entity, entity.fields);
        } else {
          throw new Error("No fields found for this entity");
        }
      }
    }

    throw new Error("Invalid entity");
  };

  getEntityHandle = async (_dbName, _id, _collectionName) => {
    console.log("getEntityHandle called  ");
    console.log(
      "_dbName : " +
        _dbName +
        ", _id : " +
        _id +
        ", _collectionName : " +
        _collectionName
    );

    const eCahceList = cache.getAll();
    if (eCahceList) {
      const keys = Object.keys(eCahceList);
      for (let i = 0; i < keys.length; i++) {
        if (eCahceList[keys[i]].id == _id) {
          console.log(keys[i] + " !== " + _collectionName);
          if (keys[i] !== _collectionName) {
            console.log("Ok, not equal so good to go");
            /* Also check if the model exist */
            if (!this.datasource.models[keys[i]]) {
              console.log("Also not found on models, so about to create");
              await this.createModel(
                _dbName,
                keys[i],
                eCahceList[keys[i]].fields
              );
            }
          }
          return keys[i];
        }
      }
    }
  };

  /**
   *
   * Things got complicated since now we have to support more than one DB
   *
   */
  migrate = () => {
    let modelName = "";
    const eCahceList = cache.getAll();

    if (eCahceList) {
      const entities = Object.keys(eCahceList);
      for (let i = 0; i < entities.length; i++) {
        modelName = entities[i];

        /* Remove */
        DBM.removeModel(process.env.EVENT_MONGO_DB, modelName);
        DBM.removeModel(process.env.TICKET_MONGO_DB, modelName);

        this.checkCollection(
          process.env.EVENT_MONGO_DB,
          modelName + "s",
          eCahceList[modelName]
        );
        this.checkCollection(
          process.env.TICKET_MONGO_DB,
          modelName + "s",
          eCahceList[modelName]
        );
      }
    }
  };

  checkCollection = async (_db, _collection, _metaFields) => {
    let _fields = [];
    for (let i = 0; i < _metaFields.fields.length; i++) {
      if (_metaFields.fields[i].status) {
        _fields.push(_metaFields.fields[i]);
      }
    }

    this.datasource = DBM.connections[_db];
    if (!this.datasource) {
      return;
    }

    const db = this.datasource.connection.useDb(_db, this.getDbOption());
    const collection = db.collection(_collection);

    if (collection) {
      try {
        const document = await collection.findOne();
        if (document) {
          const _documentFields = Object.keys(document);

          /**
           *
           * _id
           * __v
           * createdAt
           * updatedAt
           *
           * The above fields are default, so it has to be subtracted from the fields count
           *
           */
          if (_fields.length !== _documentFields.length - 4) {
            /* Document fields not matching - so has to migrated */
            return this.migrateCollection(db, _collection, _fields);
          }
        }
      } catch (_e) {
        console.log(_e);
      }
    }
  };

  migrateCollection = async (_db, _collection, _metaFields) => {
    let document = {};
    let collection = _db.collection(_collection);
    const oldDocuments = await collection.find().toArray();

    /* Drop the old collection */
    await _db.collection(_collection).drop();

    /* Now create new collection */
    collection = await _db.createCollection(_collection);

    /* Now insert the old documents */
    for (let i = 0; i < oldDocuments.length; i++) {
      document = {};
      document["_id"] = oldDocuments[i]._id;
      document["createdAt"] = oldDocuments[i].createdAt;
      document["updatedAt"] = oldDocuments[i].updatedAt;
      document["__v"] = oldDocuments[i].__v;

      /* Prepare it */
      for (let j = 0; j < _metaFields.length; j++) {
        if (oldDocuments[i][_metaFields[j].handle]) {
          document[_metaFields[j].handle] =
            oldDocuments[i][_metaFields[j].handle];
        } else {
          document[_metaFields[j].handle] = _metaFields[j].default;
        }
      }

      /* Insert it */
      await collection.insertOne(document);
    }
  };

  getDbOption = () => {
    return {
      useCache: true,
      noListener: true,
    };
  };
}

const EM = new EntityManager();
export default EM;
