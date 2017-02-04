let mongoose = require('mongoose');
let sha1 = require('sha1');
let Schema = mongoose.Schema;

let searchSchema = new Schema({
  qText: String,
  qParam: String,
  imageList: Array,
  resultPage: Number,
  totalPages: Number,
  updated: { type: Date, default: Date.now }
 });

searchSchema.statics.findById = function (id,callback) {
  this.findOne({_id:id}, function(err, data) { return callback(err,data); });
}

searchSchema.statics.findSearch = function(query, callback) {
  this.findOne({$and:[{qText:query.qText},{resultPage:query.resultPage}]}, function(err,search) {
    return callback(err,search);
  });
}

searchSchema.statics.saveSearch = function(query, callback) {
  let newSearch=new this();
  newSearch.qText=query.qText;
  newSearch.qParam=query.qParam;
  newSearch.imageList=query.imageIDArr;
  newSearch.resultPage=query.resultPage;
  newSearch.totalPages=query.totalPages;
  newSearch.save(callback);
}

module.exports=mongoose.model('Search', searchSchema);
