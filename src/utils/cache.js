/**
 * 
 * @author          Sark
 * @version         1.0.0
 * @description     Helper utils for storing key values
 *                  An object cache (because it's singleton instance)
 *                  Used mainly for maintaining Entity Meta
 * 
 */
class Cache {

    constructor() {

        if (!Cache.instance) {
            this.entityCache = {};
            Cache.instance = this;
        }
  
        return Cache.instance;

    }

    getAll = () => this.entityCache;

    setEntities = (_value) => {
        this.entityCache = _value;
    }

    setEntity = (_key, _value) => {
        this.entityCache[_key] = _value;
    }  
    
    getEntity = (_key) => {
        return this.entityCache[_key];
    }

    hasEntity = (_key) => {
        return this.entityCache[_key] ? true : false;
    }
  
    removeEntity = (_key) => {
        delete this.entityCache[_key];
    }  

}
  
// Create a single instance of the Cache class
const cache = new Cache();
  
// Export the instance to make it accessible from other modules
export default cache;