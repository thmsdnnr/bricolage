let ids = {
  twitter: {
    consumerKey: process.env.C_KEY,
    consumerSecret: process.env.C_SECRET,
    callbackURL: 'https://bricolage.herokuapp.com/auth/twitter/callback'
  }
};

module.exports = ids;
