require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const mongoDB = 'mongodb://localhost:27017/animeXusersDB';
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret:"OurSecret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect(mongoDB);


const userSchema = new mongoose.Schema ({
    email: String,
    name: String,
    password: String,
    googleId: String,
    facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", (req, res) => {
    res.render("index.ejs")
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/home', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });

  app.get("/home", (req, res) => {
    if (req.isAuthenticated()){
        res.render("home");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", (req,res) => {
     req.logout(function(err) {
        if (err) { return next(err); }
            res.redirect('/');
  });
});

app.post("/register", (req, res) => {
    const name = req.body.name;
    const username = req.body.username;
    if (req.body.password === req.body.con_password){
      User.register({username: username, name: name}, req.body.password).then( (user) => {
        if(user){
            passport.authenticate("local")(req, res, () => {
              console.log(user);
                res.redirect("/home");
            });
        } else {
            res.redirect("/register");
        }
     });
    } else {
      res.render("register", {message: "Passwords don't match!"});
    }

});

app.post("/login", (req,res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err) => {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local", { failureRedirect: '/login', failureMessage: true })(req, res, () => {
                res.redirect("/home");
            });
        }
    });
});

app.listen(3000, () => {
    console.log("Server running at port 3000");
});
