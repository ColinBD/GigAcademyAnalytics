require("dotenv").config();

var express = require("express");
var passport = require("passport");
var Strategy = require("passport-basecamp").Strategy;
var Request = require("request");
var keys = require("./config/keys");
var path = require("path");

let promises = []; //promises array

// Configure the Facebook strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.

passport.use(
  new Strategy(
    {
      clientID: keys.basecampClientID,
      clientSecret: keys.basecampClientSecret,
      callbackURL: "/return"
    },
    function(accessToken, refreshToken, profile, cb) {
      return cb(null, profile);
    }
  )
);

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

// Create a new Express application.
var app = express();

// Configure view engine to render EJS templates.
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require("morgan")("combined"));
app.use(require("cookie-parser")());
app.use(require("body-parser").urlencoded({ extended: true }));
app.use(
  require("express-session")({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true
  })
);
app.use(express.static(path.join(__dirname, "public")));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

// Define routes.
app.get("/", function(req, res) {
  if (req.user) {
    console.log("we've got a user with ID: ");
    //console.log(req.user.accounts[0])
    //console.dir(req.user.accounts)
    console.dir(req.user);
  }
  res.render("home", { user: req.user });
});

// app.get('/login',
//   function(req, res){
//     res.render('login');
//   });

app.get("/login/basecamp", passport.authenticate("basecamp"));

app.get(
  "/return",
  passport.authenticate("basecamp", { failureRedirect: "/" }),
  function(req, res) {
    res.redirect("/");
  }
);

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.get(
  "/profile",
  require("connect-ensure-login").ensureLoggedIn("/"),
  function(req, res) {
    res.render("profile", { user: req.user });
  }
);

app.get(
  "/projects/:user_id/:user_token",
  require("connect-ensure-login").ensureLoggedIn("/"),
  function(req, res) {
    //res.send("here is some project data");
    let { user_id, user_token } = req.params;

    var options = {
      url: `https://3.basecampapi.com/${user_id}/projects.json`,
      headers: {
        authorization: `bearer ${user_token}`,
        "user-agent": "Gig-Academy (c.dodds2@newcastle.ac.uk)"
      }
    };

    function callback(error, response, body) {
      //let projects = []
      if (!error) {
        // projects = JSON.parse(body)
        // console.log("*** PROJECTS ***");
        // console.dir(projects);
        res.json({
          data: body
        });
      } else {
        res.send("an error occured");
      }
    }

    Request(options, callback);
  }
);

app.get(
  "/getPeople/:user_id/:user_token/:HQ_id",
  require("connect-ensure-login").ensureLoggedIn("/"),
  function(req, res) {
    let { user_id, user_token, HQ_id } = req.params;
    let compiledBody = [];
    var options = {
      url: `https://3.basecampapi.com/${user_id}/projects/${HQ_id}/people.json`,
      headers: {
        authorization: `bearer ${user_token}`,
        "user-agent": "Gig-Academy (c.dodds2@newcastle.ac.uk)"
      }
    };

    function callback(error, response, body) {
      if (!error) {
        let input = JSON.parse(body);
        compiledBody = [...compiledBody, ...input];
        if (response.headers.link === undefined) {
          //send the data through to the client
          res.json({
            data: JSON.stringify(compiledBody)
          });
        } else {
          //update the options URL with the link header
          let str = response.headers.link;
          str = str.split("<");
          str = str[1].split(">");
          str = str[0];
          options.url = str;
          //call the Request function again
          Request(options, callback);
        }
      } else {
        res.send("an error occured");
      }
    }

    Request(options, callback);
  }
);

app.get(
  "/getTeamInfo/:user_id/:user_token/:team_id",
  require("connect-ensure-login").ensureLoggedIn("/"),
  function(req, res) {
    let { user_id, user_token, team_id } = req.params;

    var options = {
      url: `https://3.basecampapi.com/${user_id}/projects/${team_id}.json`,
      headers: {
        authorization: `bearer ${user_token}`,
        "user-agent": "Gig-Academy (c.dodds2@newcastle.ac.uk)"
      }
    };

    function callback(error, response, body) {
      if (!error) {
        let data = JSON.parse(body);
        console.dir(data);
        let dockInfo = {};
        //promises array was here
        for (let i = 0; i < data.dock.length; i++) {
          const myPromise = getDockData(data.dock[i].url, user_token).then(
            data => {
              dockInfo = { ...dockInfo, ...data };
            }
          );
          promises.push(myPromise); //add the promise to the array so we can keep track of their resolution
        }
        //when all promises resolve
        Promise.all(promises).then(function() {
          res.json({
            data: JSON.stringify(dockInfo)
          });
        });
      } else {
        res.send("an error occured");
      }
    }

    Request(options, callback);
  }
);

//get dock data
function getDockData(url, token) {
  return new Promise((resolve, reject) => {
    var options = {
      url: url,
      headers: {
        authorization: `bearer ${token}`,
        "user-agent": "Gig-Academy (c.dodds2@newcastle.ac.uk)"
      }
    };

    function callback(error, response, body) {
      if (!error) {
        let data = JSON.parse(body);
        //console.dir(data)
        let obj = {};
        switch (data.title) {
          case "Campfire":
            //get the length of the list from here: data.lines_url
            const myPromise = getChatLength(data.lines_url, token).then(
              data => {
                obj = { chat: data };
                resolve(obj);
              }
            );
            break;
          case "Message Board":
            obj = { message_board: data.messages_count };
            resolve(obj);
            break;
          case "To-dos":
            obj = { todoset: data.completed_ratio };
            resolve(obj);
            break;
          case "Schedule":
            obj = { schedule: data.entries_count };
            resolve(obj);
            break;
          case "Automatic Check-ins":
            obj = { questionnaire: data.questions_count };
            resolve(obj);
            break;
          case "Docs & Files":
            // if (data.vaults_count == 0) {
            //   let total =
            //     parseInt(data.uploads_count) + parseInt(data.documents_count);
            //   obj = { vault: total };
            //   resolve(obj);
            // } else {
            //   //get the length of the list from here: data.lines_url
            //   const myPromise = getVaultLength(data.vaults_url, token).then(
            //     vaultData => {
            //       console.log(
            //         "We've got the number of vault files: " + vaultData
            //       );
            //       let total =
            //         parseInt(data.uploads_count) +
            //         parseInt(data.documents_count) +
            //         vaultData;
            //       obj = { vault: total };
            //       resolve(obj);
            //     }
            //   );
            // }
            let total =
              parseInt(data.uploads_count) +
              parseInt(data.documents_count) +
              parseInt(data.vaults_count);
            obj = { vault: total };
            resolve(obj);
            break;
          case "Email Forwards":
            obj = { inbox: data.forwards_count };
            resolve(obj);
            break;
          default:
            console.log("no matches found with API counts");
        }
      } else {
        reject("there was an error");
      }
    }

    Request(options, callback);
  });
}

//get number of chats
function getChatLength(url, token) {
  return new Promise((resolve, reject) => {
    var options = {
      url: url,
      headers: {
        authorization: `bearer ${token}`,
        "user-agent": "Gig-Academy (c.dodds2@newcastle.ac.uk)"
      }
    };
    let length = 0;
    function callback(error, response, body) {
      if (!error) {
        length += JSON.parse(body).length;
        if (response.headers.link === undefined) {
          //no more pages so send the data
          resolve(length);
        } else {
          //get the next page and compile it
          let str = response.headers.link;
          str = str.split("<");
          str = str[1].split(">");
          str = str[0];
          options.url = str;
          //call the Request function again
          Request(options, callback);
        }
      } else {
        reject("there was an error getting the length of the chat");
      }
    }
    Request(options, callback);
  });
}

//get number of chats
function getVaultLength(url, token) {
  return new Promise((resolve, reject) => {
    var options = {
      url: url,
      headers: {
        authorization: `bearer ${token}`,
        "user-agent": "Gig-Academy (c.dodds2@newcastle.ac.uk)"
      }
    };
    let length = 0;
    function callback(error, response, body) {
      if (!error) {
        data = JSON.parse(body);
        for (let i = 0; i < data.length; i++) {
          console.log(`documents_count ${data[i].documents_count}`);
          console.log(`uploads_count ${data[i].uploads_count}`);
          console.log(`vaults_count ${data[i].vaults_count}`);
          length +=
            parseInt(data[i].documents_count) +
            parseInt(data[i].uploads_count) +
            parseInt(data[i].vaults_count);
        }
        if (response.headers.link === undefined) {
          //no more pages so send the data
          resolve(length);
        } else {
          //get the next page and compile it
          let str = response.headers.link;
          str = str.split("<");
          str = str[1].split(">");
          str = str[0];
          options.url = str;
          //call the Request function again
          Request(options, callback);
        }
      } else {
        reject("there was an error getting the length of the vaults file");
      }
    }
    Request(options, callback);
  });
}

app.get(
  "/getPeopleInTeams/:user_id/:user_token/:team_id",
  require("connect-ensure-login").ensureLoggedIn("/"),
  function(req, res) {
    let { user_id, user_token, team_id } = req.params;

    var options = {
      url: `https://3.basecampapi.com/${user_id}/projects/${team_id}/people.json`,
      headers: {
        authorization: `bearer ${user_token}`,
        "user-agent": "Gig-Academy (c.dodds2@newcastle.ac.uk)"
      }
    };

    function callback(error, response, body) {
      if (!error) {
        let data = JSON.parse(body);
        console.dir(data);
        res.json({
          data: body
        });
      } else {
        res.send("an error occured");
      }
    }

    Request(options, callback);
  }
);

app.listen(process.env["PORT"] || 3000);
