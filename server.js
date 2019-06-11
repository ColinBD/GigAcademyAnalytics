require("dotenv").config();

var express = require("express");
var passport = require("passport");
var Strategy = require("passport-basecamp").Strategy;
var Request = require("request");
var keys = require("./config/keys");
var path = require("path");

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

app.use(passport.initialize());
app.use(passport.session());

// Define routes.
app.get("/", function(req, res) {
  if (req.user) {
    // console.log("we've got a user with ID: ");
    // console.dir(req.user);
  }
  res.render("home", { user: req.user });
});

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
    let { user_id, user_token } = req.params;

    var options = {
      url: `https://3.basecampapi.com/${user_id}/projects.json`,
      headers: {
        authorization: `bearer ${user_token}`,
        "user-agent": "Gig-Academy (c.dodds2@newcastle.ac.uk)"
      }
    };

    function callback(error, response, body) {
      if (!error) {
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

//to get the initial list of participants in a project
//filter out any admins
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
          //filter the data array to remove any admins (where admin: true)
          compiledBody.filter(item => item.admin != true);
          //filter the data array to remove anyone with tile "external"
          compiledBody.filter(item => item.title.toUpperCase() != "EXTERNAL"); //uppercase just to make this filter a little more robust as a teacher may enter External, external, ETERNAL and we want to catch them
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
  "/getTeamInfo/:user_id/:user_token/:team_id/:admin_List?",
  require("connect-ensure-login").ensureLoggedIn("/"),
  function(req, res) {
    let { user_id, user_token, team_id, admin_List } = req.params;
    let admins = [];
    if (admin_List != undefined) {
      //separate the string out into an admins array
      admins = admin_List.match(/.{1,8}/g);
      admins = admins.map(item => parseInt(item));
    }

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
        let promises = []; //promises array
        //console.dir(data);
        let dockInfo = {};
        //promises array was here
        for (let i = 0; i < data.dock.length; i++) {
          const myPromise = getDockData(data.dock[i].url, user_token, admins)
            .then(data => {
              dockInfo = { ...dockInfo, ...data };
            })
            .catch("oops. I messed up a promise resolution");
          promises.push(myPromise); //add the promise to the array so we can keep track of their resolution
        }
        //when all promises resolve
        Promise.all(promises).then(function() {
          console.log("all promises resolved so all dock URLs processed");
          promises = []; //clear the array
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

//get dock data for the group
function getDockData(url, token, admins) {
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
        //console.dir(data);
        let obj = {};
        switch (data.title) {
          case "Campfire":
            //get the length of the list from here: data.lines_url enuring admins contributions are filtered out
            const myCampfirePromise = getFilteredDataLength(
              data.lines_url,
              token,
              admins,
              "chat"
            ).then(data => {
              obj = { chat: data };
              resolve(obj);
            });
            break;
          case "Message Board":
            const myMsgBoardPromise = getFilteredDataLength(
              data.messages_url,
              token,
              admins,
              "messages"
            ).then(data => {
              obj = { message_board: data };
              resolve(obj);
            });
            break;
          case "To-dos":
            //get the ratio of to-dos completed
            obj = { todoset: data.completed_ratio };
            resolve(obj);
            break;
          case "Schedule":
            //get the number of scheduled entries ensuring admins contributions are filtered out
            // console.log("*** here comes SCHEDULE data ***");
            // console.dir(data);
            obj = { schedule: data.entries_count };
            resolve(obj);
            break;
          case "Automatic Check-ins":
            //get the number of check-ins ensuring admins contributions are filtered out
            obj = { questionnaire: data.questions_count };
            resolve(obj);
            break;
          case "Docs & Files":
            //get the number of docs & files ensuring admins contributions are filtered out
            let total =
              parseInt(data.uploads_count) +
              parseInt(data.documents_count) +
              parseInt(data.vaults_count);
            obj = { vault: total };
            resolve(obj);
            break;
          case "Email Forwards":
            //get the number of emails forwarded ensuring admins contributions are filtered out
            obj = { inbox: data.forwards_count };
            resolve(obj);
            break;
          default:
            console.log("no matches found with API counts");
        }
      } else {
        reject(new Error("there was an error"));
      }
    }

    Request(options, callback);
  });
}

//get number of chats
function getFilteredDataLength(url, token, admins, type) {
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
        //filter the body here removing any items belonging to people in the admins array
        let thebody = JSON.parse(body);
        //if we are getting the chat/message length for the group we need to filter out the admins
        //however if we are getting the chat length for an individual 'admins' will not have been passed
        if (admins != undefined) {
          let preFilterlength = thebody.length;
          thebody = thebody.filter(
            item => admins.includes(item.creator.id) == false
          );
          console.log(
            `Filtered ${type} length from ${preFilterlength} to ${
              thebody.length
            }`
          );
        }
        length += thebody.length;
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
        reject(`there was an error getting the ${type} length`);
      }
    }
    Request(options, callback);
  });
}

//get number of documents
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

//get info for a specific person
app.get(
  "/getPersonInfo/:account_id/:user_token/:user_id/:team_id",
  require("connect-ensure-login").ensureLoggedIn("/"),
  function(req, res) {
    let { account_id, user_token, user_id, team_id } = req.params;

    var options = {
      url: `https://3.basecampapi.com/${account_id}/projects/${team_id}.json`,
      headers: {
        authorization: `bearer ${user_token}`,
        "user-agent": "Gig-Academy (c.dodds2@newcastle.ac.uk)"
      }
    };

    console.log(`URL is ${options.url}`);

    function callback(error, response, body) {
      if (!error) {
        let data = JSON.parse(body);
        let dockInfo = {};
        //loop through the dock items extracting these dock URls to then process them
        for (let i = 0; i < data.dock.length; i++) {
          const myPromise = getPersonsDockData(
            data.dock[i].url,
            user_token
          ).then(data => {
            console.dir(data);
            dockInfo = { ...dockInfo, ...data };
          });
          promises2.push(myPromise); //add the promise to the array so we can keep track of their resolution
        }
        //handle the promise resolution
        //when all promises resolve
        Promise.all(promises2).then(function() {
          console.log("we have the data for the individual");
          promises2 = []; //clear the array
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

//get individual persons data from the dock data types
function getPersonsDockData(url, token) {
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
            const myPromise = getChatLength(data.lines_url, token).then(
              data => {
                obj = { campfireChats: data };
                resolve(obj);
              }
            );
            break;
          case "Message Board":
            obj = { messagesSent: data.messages_count };
            resolve(obj);
            break;
          case "To-dos":
            obj = { toDos: 4 };
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
            let total =
              parseInt(data.uploads_count) +
              parseInt(data.documents_count) +
              parseInt(data.vaults_count);
            obj = { docsAndFiles: total };
            resolve(obj);
            break;
          case "Email Forwards":
            obj = { emailsForwarded: data.forwards_count };
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

app.get("*", function(req, res) {
  res.send("Oops! We can't find what you're looking for");
});

app.listen(process.env["PORT"] || 3000);
