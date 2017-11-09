const mongoDB = require('mongodb').MongoClient;
const Abstract = require('abstract-level-down');
const AbstractLD = Abstract.AbstractLevelDown;
const AbstractIterator = Abstract.Iterator;

/**
 * @class
 * @classdesc
 * 
 * _open()
 * 
 * _get()
 * 
 * _put()
 * 
 * _del()
 */
class MongoDown extends AbstractLD {

	/**
	 * @constructor
	 * 
	 * @param {Object} params - contructor params
	 * @param {String} params.location - Location of the Mongo Database
	 * @param {String} params.url - URL of the mongoDB
	 * @param {String} params.collection - Collection which the API want to access 
	 * @return {Object} a new instance of the MongoDown Class
	 */
	constructor(params) {
		this.url = params.url;
		this.collection = params.collection || 'default_collection';
		// if (!(this instanceof MongoDown)) {
		// 	return new MongoDown(MongoUri);
		// }
		// AbstractLD.call(this, params.location);
	}

	/**
	 * Open the mongoDB connection
	 * 
	 * @param {Object} options - 
	 * @param {*} callback 
	 */
	open(options, callback) {
		mongoDB.connect(this.url, (err, db) => {
			if (options.reconnect & !this.terminated) {
				console.log('reconnect');
				db.on("close", () => {
					this._open(options);
				});
				db.on("error", () => {
					this._open(options);
				});
			}
			this.db = db;
			if (typeof callback === 'function') {
				setImmediate(() => {
					callback(null, this);
				})
			}
		});
	};

	/**
	 * Insert a new data
	 * 
	 * @param {*} key 
	 * @param {*} value 
	 * @param {*} options 
	 * @param {*} callback 
	 */
	put(key, value, options, callback) {
		const collection = this.collection;
		this.db.collection(collection).update(
			{ key : key },
			{ key : key, value : value },
			{ upsert : true }, (err, result) => {
				if (typeof callback === 'function') {
					setImmediate(() => {
						callback(err, result, result.value);
					})
				}
			}
		)
	}
}