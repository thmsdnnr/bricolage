const querystring=require('querystring');
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
});

app.post('/mod', function(req,res) { //update user images (add/delete)
  console.log(req.body);
  //takes an IMAGE ID (req.body.id), an action (req.body.action) [ADD, DELETE], and (req.body.user) for matching-user authentication
  let id=req.body.id.slice(2); //lop off the Z_ we prepend to the ID internally to make number-beginning IDs valid selectors
  if (req.body.user!==req.session.user) { return false; } //not authorized to tamper if logged out or on another user's page
  if (req.body.action==='ADD') {
    Image.findOrCreate({imageID:id, info:req.body.imgData}, function(err, data) { //adds it to our link database as well
      if(err) { console.log('error:',err); }
    });
    User.addImageToUser({username:req.body.user, id:id}, function(err, data) {
      if(!err) { res.send('success');}
    });
  }
  if (req.body.action==='DELETE') {
    User.removeImageFromUser({username:req.body.user, id:id}, function(err, data) {
      if(!err) { res.send('success');}
    });
  }
});

/* --- ASYNC Database and HTTP Wrapper Helpers --- */
function imageSearchUnsplash(query,params) { //Returns a promise containing the Unsplash query result set
  return new Promise(function (resolve,reject) {
    let rPage=params.resultPage || 1;
        fetch(`https://api.unsplash.com/search/photos?page=${rPage}&query=${query}&client_id=${process.env.API_KEY}`)
      .then(function(images) {
        if (!images.errors) { resolve(images.json()); }
        else { reject(images.errors); }
      }).catch(function(err) { console.log(err); reject(err); });
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

function payloadPrep(data,user) {
  return new Promise(function(resolve,reject) {
  let imgLinks=[]; //URLs to images from this search. Never null.
  let userList=getUserImageDict(user); //images the user has already added in this search. Could be null.
  let imgDict={}; //info about all the images in this search. Never null.
  let imgPromises=data.imageList.map((img)=>getOnePhoto(img));
  Promise.all(imgPromises).then(function(images) {
    images.forEach((img)=>{
      let i=img.imageInfo;
      imgLinks.push({id:i.id,url:i.urls.small});
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
      else {
        reject('no data');
      }
    });
  });
}

//Display users who have image walls
//Randomize preview image by randomizing their thumbnails
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
        });
      }
    }
  });
});

app.get('/s', function(req,res) {
  //RESTOFURL/s/?q=${query}&p=${page}
  //reject if p<1 or if p contains non-numeric characters or if p>100
  if(!Object.keys(req.query).length) {
    res.render('search', {data:{user:req.session.user},message:req.flash('welcomeMessage')});
  }
  //regex out any non numeric characters or numbers >100 or <1 for pages
  else if (((req.query.p.match(/[^0-9]/gi)||req.query.p<1))||req.query.p>100) {
    res.render('search', {data:{user:req.session.user, message:'Malformed search request!'}});
  }
  //regex out any nonword characters except spaces or the null string
  else if ((req.query.q==='')||(req.query.q.match(/[^\w\s]/gi))) {
    res.render('search', {data:{user:req.session.user, message:'Malformed search request!'}});
  }
  else { //WE ARE GOOD
    let imgLinks=[]; //URLs to images from this search. Never null.
    let userList=getUserImageDict(req.session.user); //images the user has already added in this search. Null -- if no logged in user for sure.
    let imgDict={}; //info about all the images in this search. Never null.
    let resultPage=req.query.p; //the form gives it to us as "1" instead of 1
    Search.findSearch({qText:req.query.q,resultPage:req.query.p}, function(err,data){
      if(err) {console.log(err); return false; }
      if(!data) {
        imageSearchUnsplash(req.query.q,{resultPage:req.query.p}).then(function(images) {
          //for a blank result, images will look like this: { total: 0, total_pages: 0, results: [] }
          if(images.results) {
            images.results.forEach((img)=>{
              //build array to send to client
              imgLinks.push({id:img.id,url:img.urls.small});
              imgDict[img.id]={imageInfo:img};
              //save images to Db.
              Image.findOrCreate({imageID:img.id,data:img},function(err,data) {
            });
          });
          //save search to Db
          let imageIDArr=images.results.map((img)=>img.id);
          Search.saveSearch({qText:req.body.qText,qParams:req.body.qParam,imageIDArr:imageIDArr,resultPage:req.query.p,totalPages:images.total_pages}, function(err, data) {
            if(err) { console.log(err); return false; }
          });
          //render page
          let payload={data:imgLinks, user:req.session.user, userList:userList, dict:imgDict,
            query:{query:req.query.q, numImages:images.total, resultPage:req.query.p, totalPages:images.total_pages}};
          res.render('wall',{data:payload});
        }
        else { //no data in UNSPLASH. Handle gracefully. And don't save the search query!
          let payload={header:'You outsmarted us!',message:`Well, you reached the end of the Internets. Congratulations! There were no search results available. Why don't you <a href="/s">go back</a> and search again?`}
          res.render('message',{data:payload});
        }
      }).catch(function(err) {console.log(err); res.send('There was a bad thing');});
    }
      else { //there is data, and we have it in the Db already.
        let payload=payloadPrep(data,req.session.user);
        payload.then(function(payload) {
          res.render('wall',{data:payload});
        }).catch(function(err){
          console.log(err);
        });
      }
    });
  }
});

app.get('/w/:username', function(req,res) { //Get a user's wall given a username
  if (!req.params.username) { res.redirect('/'); }
  let imgLinks=[]; //URLs to images from this search. Never null.
  let userList;
  (req.session.user) ? userList=getUserImageDict(req.session.user) : userList=null; //images the user already has. Could be null.
  let imgDict={}; //info about all the images in this search. Never null.
    User.getUserImages({username:req.params.username}, function(err,data) {
      if(!err) {
        if (data)
        {
          let photoPromises=data.photoWall.map((photo)=>getOnePhoto(photo));
          Promise.all(photoPromises).then(function(data) {
            data.forEach((img)=>{
              let i=img.imageInfo;
              imgLinks.push({id:i.id,url:i.urls.small});
              imgDict[i.id]=img;
            });
            imgLinks.reverse(); //display in descending order, so newest added come first
    if (userList) { userList.then(function(uList) {
      let payload={data:imgLinks, user:req.session.user, userList:uList, dict:imgDict};
      res.render('wall',{data:payload});
      });
    }
    else {
      let payload={data:imgLinks, user:req.session.user, userList:'', dict:imgDict};
      res.render('wall',{data:payload});
    }
  });
}
  else { //our wall.ejs handles blank data with an appropriate message
    res.render('wall',{data:''});
    }
  }
});
});

//Catch-all route
app.get('*', (req,res)=>{ res.redirect('/login'); });
app.listen(process.env.PORT||3000);
