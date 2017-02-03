const express=require('express');
const bodyParser=require('body-parser');
const path=require('path');
const fetch = require('node-fetch');
const Db=require('./bricolageDb.js');
const db=Db.mongooseDatabase;
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const mongoose=require('mongoose');
const cookieParser = require('cookie-parser');
const helmet=require('helmet');
const flash = require('connect-flash');

//Passport login strategies
const passport=require('passport');
const TwitterTokenStrategy=require('passport-twitter');
const passportTwitter=require('./auth/twitter');
const passportLocal=require('./config/passport');

//Mongoose data models
const User=require('./models/user');
const Image=require('./models/image');
const Search=require('./models/search');

const app=express();
app.use(helmet());
app.use(cookieParser(process.env.SESSION_SECRET || 'DREAMSBEDREAMS'));
app.use(session({
  store: new MongoStore({
    mongoose_connection: db,
    url: process.env.PROD_DB || 'mongodb://localhost:27017/bricolage',
    ttl: 14 * 24 * 60 * 60 // = 14 days. Default
  }), //https://github.com/jdesboeufs/connect-mongo
  secret: process.env.SESSION_SECRET || 'DREAMSBEDREAMS',
  resave: true,
  saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.static(path.join(__dirname+'/static')));
app.use(['/login','/register','/mod','/s'],bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname+'/views'));

/* --- AUTHENTICATION: Login & Registration --- */
function auth(req,res,next) { //req.sessionStore req.sessionID req.session
   req.isAuthenticated() ? next() : res.redirect('/login');
 }

//TWITTER
app.get('/auth/twitter', passportTwitter.authenticate('twitter'));
app.get('/auth/twitter/callback', //success redirect
  passportTwitter.authenticate('twitter', { failureRedirect: '/login' }), function(req,res) {
    req.session.user=req.user.twitter.username;
    res.redirect('/s');
  });

//LOCAL
app.post('/login',
  passport.authenticate('local-login', {failureRedirect: '/login', failureFlash: true}), function(req,res){
  req.session.user=req.user.username;
  res.redirect('/s');
});
app.post('/register',
  passport.authenticate('local-register', {failureRedirect: '/register', failureFlash: true}), function(req,res){
    req.session.user=req.user.username;
    res.redirect('/s');
});

app.get('/login', (req,res) => {
  res.render('login',{message:req.flash('loginMessage')});
});

app.get('/register', (req,res) => {
  res.render('register',{data:'',message:req.flash('registerMessage')});
});

app.get('/logout', function (req,res) {
  req.logout();
  req.session.destroy();
  res.redirect('/login');
  //TODO res-render message thx for coming bro
});

app.post('/mod', function(req,res) { //update user images (add/delete)
  //takes an IMAGE ID (req.body.id), an action (req.body.action) [ADD, DELETE], and (req.body.user) for matching-user authentication
  let id=req.body.id.slice(2); //lop off the Z_ we prepend to the ID internally to make number-beginning IDs valid selectors
  console.log(req.body);
  if (req.body.user!==req.session.user) { return false; } //not authorized to tamper if logged out or on another user's page
  if (req.body.action==='ADD') {
    Image.findOrCreate({imageID:id, info:req.body.imgData}, function(err, data) { //adds it to our link database as well
      console.log(data);
    });
    User.addImageToUser({username:req.body.user, id:id}, function(err, data) {
      if(!err) {console.log(data); res.send('success');}
    });
  }
  if (req.body.action==='DELETE') {
    User.removeImageFromUser({username:req.body.user, id:id}, function(err, data) {
      if(!err) {console.log(data); res.send('success');}
    });
  }
});

/* --- ASYNC Database and HTTP Wrapper Helpers --- */
function imageSearchUnsplash(query,params) { //Returns a promise containing the Unsplash query result set TODO implement params
  let qP = {"title":"intitle:","author":"inauthor:","subject":"subject:","ISBN":"isbn:"};
  return new Promise(function (resolve,reject) {
        fetch(`https://api.unsplash.com/search/photos?page=1&query=${query}&client_id=${process.env.API_KEY}&perPage=16}`)
      .then(function(images) { //console.log(images);
        resolve(images.json()); })
      .catch(function(err) { console.log(err); reject(err); }); //returns a promise
    });
  }

function getOnePhoto(imageID) { //Returns a promise for an image grab from the database
    return new Promise(function(resolve,reject) {
      Image.findByImageID(imageID, function(err,data) {
      if(data) { resolve(data); }
      if(err) {reject(err);}
    });
  });
}

function payloadPrep(data,user) { //TODO clean up this ugly promise nesting
  return new Promise(function(resolve,reject) {
  let imgLinks=[]; //URLs to images from this search. Never null.
  let userList=getUserImageDict(user); //images the user has already added in this search. Could be null.
  let imgDict={}; //info about all the images in this search. Never null.
  let imgPromises=data.imageList.map((img)=>getOnePhoto(img));
  Promise.all(imgPromises).then(function(images) {
    images.forEach((img)=>{
      let i=img.imageInfo;
      imgLinks.push({id:i.id,url:i.urls.small}); //TODO change this maybe sizewise
      imgDict[i.id]=img;
    });
    userList.then(function(userList) {
      let payload={data:imgLinks, user:user, userList:userList, dict:imgDict};
      resolve(payload);
    });
    }).catch(function(err){reject(err);});
  });
}

function getUserImageDict(user) { //Returns promise to generate a dictionary of IMAGE ID->1 pairs for each image the user already has on zher wall
  return new Promise(function(resolve,reject) {
    User.getUserImages({username:user}, function(err,data) {
      if(err) { console.log(err); reject(err); }
      if(data) {
        let userDict={};
        data.photoWall.forEach((img)=>{
          userDict[img]=1;
        });
        resolve(userDict);
      }
    });
  });
}
/* --- */

//Display users who have image walls

app.get('/w/all', function(req,res) {
  User.listUsersWithPhotos(function(err, data){
    if(!err) {
      if(data) {
        let thumbPromises=[];
        let users=[];
        data.forEach((user)=>{
          let rIndex=Math.floor((Math.random()*user.photoWall.length)); //random array index
          thumbPromises.push(getOnePhoto(user.photoWall[rIndex]));
        });
        Promise.all(thumbPromises).then(function(t){
          for (var i=0;i<data.length;i++) {
            users.push({user:data[i].username, thumbURL:t[i].imageInfo.urls.thumb, numImages:data[i].photoWall.length});
          }
          res.render('userPages',{data:{users:users, user:req.session.user}});
          console.log(users);
        });
      }
    }
  });
});

//SEARCH routes for UNSPLASH
app.get('/s', function(req,res) { res.render('search', {data:{user:req.session.user},message:req.flash('welcomeMessage')}); });

app.post('/s', function(req,res) {
  let imgLinks=[]; //URLs to images from this search. Never null.
  let userList=getUserImageDict(req.session.user); //images the user has already added in this search. Could be null.
  let imgDict={}; //info about all the images in this search. Never null.

  Search.findSearch({qText:req.body.qText,qParams:req.body.qParam}, function(err,data){
    if(err) {console.log(err); return false; }
    if(!data) {
      imageSearchUnsplash(req.body.qText).then(function(images) {
        //for a blank result, images will look like this:
        //{ total: 0, total_pages: 0, results: [] }
        if(images.results.length) {
          images.results.forEach((img)=>{
            //build array to send to client
            imgLinks.push({id:img.id,url:img.urls.small}); //TODO change this maybe sizewise
            imgDict[img.id]={imageInfo:img}; //TODO we add the imageInfo key here to make this match up with our SAVED image object path
            //could maybe clean this up: thing being the Unsplash API data doesn't match with the way we store the Image data in our Schema
            //wrt reading from the wall.ejs
            //save images to Db.
            Image.findOrCreate({imageID:img.id,data:img},function(err,data) {
            console.log('ImagefindorCreate:',err,data);
          });
        });
        //save search to Db
        let imageIDArr=images.results.map((img)=>img.id);
        Search.saveSearch({qText:req.body.qText,qParams:req.body.qParam,imageIDArr:imageIDArr}, function(err, data) {
          if(err) { console.log(err); return false; }
        });
        //render page
        let payload={data:imgLinks, user:req.session.user, userList:userList, dict:imgDict};
        res.render('wall',{data:payload}); //TODO send current result to add pagination
      }
      else {//no data in UNSPLASH. Handle gracefully. And don't save the search query!
        let payload={header:'You outsmarted us!',message:`Well, you reached the end of the Internets. Congratulations! There were no search results available. Why don't you <a href="/s">go back</a> and search again?`}
        res.render('message',{data:payload});
      }
    });
  }
    else { //there is data, and we have it in the Db already.
      console.log('found some data. rendering');
      console.log('data', data);
      let payload=payloadPrep(data,req.session.user);
      payload.then(function(payload) {
        res.render('wall',{data:payload});
      }).catch(function(err){
        console.log(err);
      });
    }
  });
});

app.get('/w/:username', function(req,res) { //Get a user's wall given a username
  //TODO keep search user distinct from login user
  let imgLinks=[]; //URLs to images from this search. Never null.
  let userList=getUserImageDict(req.params.username); //images the user has already added in this search. Could be null.
  let imgDict={}; //info about all the images in this search. Never null.
  if (!req.params.username) {
    res.redirect('/'); //TODO default redirects
  }
    User.getUserImages({username:req.params.username}, function(err,data) {
      if(!err) {
        if (data)
        {
          let photoPromises=data.photoWall.map((photo)=>getOnePhoto(photo));
          data.photoWall.forEach((photo)=>userList[photo]=1);
          Promise.all(photoPromises).then(function(data) {
            data.forEach((img)=>{
              let i=img.imageInfo;
              imgLinks.push({id:i.id,url:i.urls.small}); //TODO change this maybe sizewise
              imgDict[i.id]=img;
            });
            imgLinks.reverse(); //display in descending order, so newest added come first
        let payload={data:imgLinks, user:req.session.user, userList:userList, dict:imgDict};
        res.render('wall',{data:payload}); //TODO send current result to add pagination
            });
          }
          else {
            res.render('wall',{data:''});
          }
        }
      });
    });

//Catch-all route
app.get('*', (req,res)=>{ res.redirect('/login'); });
app.listen(process.env.PORT||3000);
