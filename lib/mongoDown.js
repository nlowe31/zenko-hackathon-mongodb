'use strict';

var util = require('util');
var mongojs = require('mongojs');
var AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN;
var AbstractIterator = require('abstract-leveldown').AbstractIterator;

var dbExists = function (name, callback) {
  var admin = mongojs('admin');
  admin.runCommand('listDatabases', function (err, result) {
    if (err) return callback(err);
    for (var n = 0, l = result.databases.length; n < l; n++)
      if (result.databases[n].name === name) return callback(null, true);
    callback();
    admin.close();
  });
};

var MongoDOWN = module.exports = function (mongoUri) {
  if (!(this instanceof MongoDOWN))
    return new MongoDOWN(mongoUri);
  AbstractLevelDOWN.call(this, mongoUri);
};

util.inherits(MongoDOWN, AbstractLevelDOWN);

MongoDOWN.prototype._open = function (options, callback) {

  var self = this;

  self.collection = (options.collection === "users..bucket" ? "users__bucket" : (options.collection || 'mongodown'));

  var connect = function () {
    self._db = mongojs(self.location, [self.collection]);
    callback(null, self);
  };

  if (!options.createIfMissing)
    dbExists(self.location, function (err, exists) {
      if (err) return callback(err);
      if (!exists) return callback(new Error('Database ' + self.location + ' does not exist'));
      connect();
    });
  else if (options.errorIfExists)
    dbExists(self.location, function (err, exists) {
      if (err) return callback(err);
      if (exists) return callback(new Error('Database ' + self.location + ' already exists'));
      connect();
    });
  else
    process.nextTick(connect);
};

MongoDOWN.prototype._close = function (callback) {
  this._db.close();
  process.nextTick(callback);
};

MongoDOWN.prototype._get = function (key, options, callback) {
  this._db[this.collection].findOne({ _id : key }, function (err, doc) {
    if (err) return callback(err);
	if (!doc) return callback(new Error('notFound'));
	var value = JSON.stringify(doc);
    callback(null, value);
  });
};

MongoDOWN.prototype._put = function (key, value, options, callback) {
  const data = JSON.parse(value);
  this._db[this.collection].update({ _id : key }, data, { upsert: true }, callback);
};

MongoDOWN.prototype._del = function (key, options, callback) {
	this._db[this.collection].remove({ _id: key }, callback);
};

MongoDOWN.prototype._approximateSize = function (start, end, callback) {
  this._db[this.collection].count({ _id: { $gte: start, $lte: end } }, callback);
};

MongoDOWN.prototype._iterator = function (options) {
  return new MongoIterator(this, options);
};

var MongoIterator = function (db, options) {
  AbstractIterator.call(this, db);
  if (options.limit === 0) return;
  this._options = options;
  var query = { _id: {} };
  if (options.reverse) {
    if (options.start) query._id.$lte = options.start;
    if (options.end)   query._id.$gte = options.end;
    if (options.gt)    query._id.$lt  = options.gt;
    if (options.gte)   query._id.$lte = options.gte;
    if (options.lt)    query._id.$gt  = options.lt;
    if (options.lte)   query._id.$gte = options.lte;
  } else {
    if (options.start) query._id.$gte = options.start;
    if (options.end)   query._id.$lte = options.end;
    if (options.gt)    query._id.$gt  = options.gt;
    if (options.gte)   query._id.$gte = options.gte;
    if (options.lt)    query._id.$lt  = options.lt;
    if (options.lte)   query._id.$lte = options.lte;
  }
  if (!Object.keys(query._id).length) delete query._id;
  this._cursor = db._db[db.collection].find(query).sort({ _id: options.reverse ? -1 : 1 });
  if (options.limit && options.limit !== -1) this._cursor = this._cursor.limit(options.limit);
};

util.inherits(MongoIterator, AbstractIterator);

MongoIterator.prototype._next = function (callback) {
  // var options = this._options;
  if (!this._cursor) return callback();
  this._cursor.next(function (err, doc) {
    if (err) return callback(err);
    if (!doc) return callback();
    var key = doc._id;
    var val = JSON.stringify(doc);
    callback(undefined, key, val);
  });
};

MongoIterator.prototype._end = function (callback) {
  if (this._cursor) this._cursor.destroy();
  callback();
};
