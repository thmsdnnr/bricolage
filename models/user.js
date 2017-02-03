let mongoose = require('mongoose');
let sha1 = require('sha1');
let Schema = mongoose.Schema;

let userSchema = new Schema({
    username: String,
    password: String,
      twitter: {
        name: String,
        id: String,
        token: String,
        username: String,
        displayName: String
  },
  photoWall: Array //an array of URLs that correspond to Unsplash IDs
 });

userSchema.methods.validPassword = function(password) {
   return sha1(password)===this.password;
 }

userSchema.methods.generateHash = function(password) { return sha1(password); }

userSchema.statics.findByID = function (id,callback) {
  this.findOne({_id:id}, function(err, data) { return callback(err,data); });
}

userSchema.statics.listUsersWithPhotos = function (callback) {
  this.find({'photoWall.1':{$exists:true}}, {username:1, photoWall:1}, function(err, data) { return callback(err, data); });
}

userSchema.statics.findOrCreate = function (query, callback) {
  let newUser=new this();
  this.findOne({username:query.name}, function(err,user) {
    if (err) { return callback(err); }
      if (user) { return callback(null,user); }
      else {  //if user does not exist, create user with update values
        //TODO assign new user stuff to userObj
          newUser.username=query.name;
          newUser.password=query.password; //TODO different for twitter/local?
          newUser.save(callback);
          }
        });
      }

/* TODO delete this I think.
//TODO: change to findOneAndUpdate in Mongo instead not your custom one
userSchema.statics.findOneAndUpdate = function (query, updates, options, callback) {
  let User=this;
   User.findOne({username:query.name}, function(err,user) {
     if (err) { return callback(err); }
     if (!user) { return callback(null,null); }
     else { //found user so update
       User.update({username:query.name}, updates, options, (err, data) => { return callback(err,user); });
       }
     });
   }*/

userSchema.statics.addImageToUser = function (query, cb) {
  //TODO currently duplicate inserts are prevented by killing the add modal
  //could add a double-check in here with a findOne before adding to the user's page.
  this.update({ username: query.username },
    { $push: { photoWall: query.id }}, function (err, data) {
      if (err) { cb(err, null); }
      else { cb(null, data); }
    });
  }

userSchema.statics.removeImageFromUser = function (query, cb) {
  this.update({ username: query.username },
    { $pull: { photoWall: query.id }}, function (err, data) {
      if (err) { cb(err, null); }
      else { cb(null, data); }
    });
  }

userSchema.statics.getUserImages = function(query, callback) {
  this.findOne({username:query.username}, {photoWall:1}, function(err,imageList){ callback(err,imageList); });
}

module.exports=mongoose.model('User', userSchema);
