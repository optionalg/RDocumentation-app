// RedisService.js - in api/services

/**
* Abstract away boilerplate code to work with Redis
*/

var Promise = require('bluebird');


module.exports = {

  DAILY: 86400,

  WEEKLY: 604800,

  // missFn must be a function that return either a json or a Promise resolving to a json
  // it will be executed if nothing is found in cache
  getJSONFromCache: function(key, res, expire, missFn) {
    var env = process.env.AWS_ENV || 'dev';
    //if (env === 'dev') return Promise.resolve(missFn());
    key = env + '_' + key;
    return RedisClient.getAsync(key).then(function(response){
      if(res) res.set('Cache-Control', 'max-age=' + expire);
      if(response) {
        var json = JSON.parse(response);
        json.fromCache = true;
        if(res) res.set('X-Cache', 'hit');
        return json;
      } else {
        return Promise.resolve(missFn()).then(function(value) {
          if (value) RedisClient.set(key, JSON.stringify(value));
          if(res) res.set('X-Cache', 'miss');
          RedisClient.expire(key, expire);
          return value;
        });
      }
    });
  },

  del: function(key) {
    var env = process.env.AWS_ENV || 'dev';
    key = env + '_' + key;
    RedisClient.del(key);
  },

  delPrefix: function(prefix){
    var env = process.env.AWS_ENV || 'dev';
    var key = env + '_' + prefix + '*';
    RedisClient.keys(key,function(err,rows){
      Promise.map(rows,function(row){
        RedisClient.del(row);
      });
    })
  },

  invalidateTopicById: function(id) {
    RedisService.del('view_topic_' + id);
    Topic.findById(id,{include: [{model: PackageVersion, as: 'package_version'}]}).then(function(topic){
      RedisService.del('view_topic_' + topic.package_version.package_name + '_' + topic.package_version.version + '_' + topic.name);
    });
  }


};
