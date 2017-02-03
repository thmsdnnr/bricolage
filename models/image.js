let mongoose = require('mongoose');
let sha1 = require('sha1');
let Schema = mongoose.Schema;

let imageSchema = new Schema({
  imageID: String,
  imageInfo: Object,
  updated: { type: Date, default: Date.now }
 });

imageSchema.statics.findById = function (id,callback) {
   this.findOne({_id:id}, function(err, data) { return callback(err,data); });
 }

imageSchema.statics.findByImageID = function (imageID,callback) {
  this.findOne({imageID:imageID}, function(err, data) { return callback(err,data); });
}

imageSchema.statics.findOrCreate = function(query, callback) {
  let newImage=new this();
  this.findOne({imageID:query.imageID}, function(err,img) {
    if (err) { return callback(err); }
      if (img) { return callback(null,img); }
      else {  //if image does not exist, create image with values
          newImage.imageID=query.imageID;
          newImage.imageInfo=query.data;
          newImage.save(callback);
          }
        });
      }

module.exports=mongoose.model('Image', imageSchema);
