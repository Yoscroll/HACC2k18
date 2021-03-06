const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const router = express.Router();
const app = express();
//const flash = require('connect-flash');

const User = require('../../models/User');
const saltRounds = 12; //how many times to hash the password

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  //console.log("serialize", done);
  //console.log("serialize", user);
  return done(null, {
    id: user.id,
    username: user.username.toLowerCase(),
  });
});

passport.deserializeUser((user, done) => {
  console.log("deserialize", done);
  new User({ id: user.id })
    .fetch()
    .then(user => {
      console.log(user);
      user = user.toJSON();
      return done(null, {
        id: user.id,
        username: user.username.toLowerCase()
      });
    })
    .catch(err => {
      console.log('error : ', err);
      return done(err);
    });
});

passport.use(
  new LocalStrategy((username, password, done) => {
    return new User({ username: username })
      .fetch()
      .then(user => {
        if (user === null) {
          return done(null, false, {
            message: 'Invalid Username and/or Password'
          });
        } else {
          user = user.toJSON();
          bcrypt.compare(password, user.password).then(samePassword => {
            if (samePassword) {
              return done(null, user);
            } else {
              return done(null, false, {
                message: 'Invalid Username and/or Password'
              });
            }
          });
        }
      })
      .catch(err => {
        console.log('error: ', err);
        return done(err);
      });
  })
);

//Register
router.post('/register', (req, res) => {
  let { username, email, first_name, last_name} = req.body;
  bcrypt.genSalt(saltRounds, (err, salt) => {
    if (err) {
      return res.status(500);
    }
    bcrypt.hash(req.body.password, salt, (err, hashedPassword) => {
      if (err) {
        return res.status(500);
      }

      return new User({
        username: username.toLowerCase(),
        password: hashedPassword,
        email,
        first_name,
        last_name
      })
        .save()
        .then(result => {
          res.json({ success: true });
        })
        .catch(err => {
          console.log('error : ', err);
          return res.send('Unable to register with that username');
        });
    });
  });
});

//Log In
router.post('/login', (req, res, next) => {
  console.log(req.body)
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      console.log('redirecting...');
      return res.redirect('/');
    }
    req.logIn(user, err => {
      if (err) {
        return next(err);
      } else {
        let userProfile = {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          school: user.school,
          title: user.title,
          avatar_link: user.avatar_link,
          following: user.following,
          followers: user.followers,
          bio: user.bio,
          request_tokens: user.request_tokens
        };

        //req.body = userProfile;
        //req.cookie.userProfile //get userProfile
        // res.cookie('userProfile', userProfile);
        // console.log(req.body);
        // req.session.key = userProfile
        // res.json(userProfile);
        res.redirect('/feed');
        req.user = userProfile;
      }
    });
  })(req, res, next);
});

router.get('/logout', (req, res) => {
  req.logout();
  res.json({ success: true });
});

module.exports = router;