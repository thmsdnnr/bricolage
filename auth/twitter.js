const passport=require('passport');
const TwitterStrategy=require('passport-twitter').Strategy;

const User=require('../models/user');
const config=require('../config/auth');
const init=require('./init');

passport.use(new TwitterStrategy({
  consumerKey:process.env.C_KEY,
  consumerSecret:process.env.C_SECRET,
  callbackURL:config.twitter.callbackURL
},
  function(token, tokenSecret, profile, done) {
    process.nextTick(function() {
      User.findOne({'twitter.username':profile.username}, function(err, user) {
          if(err) { return done(err); }
          if(user) { return done(null, user); }
          else {
            let newUser = new User();
            newUser.username=profile.username;
            newUser.twitter.id = profile.id;
            newUser.twitter.token = token;
            newUser.twitter.username = profile.username;
            newUser.twitter.displayName = profile.displayName;
            newUser.save(function(err) {
              if (err) { throw err; }
              return done(null, newUser);
            });
          }
        });
      });
    }
  ));

//serialize user
init();

module.exports=passport;
