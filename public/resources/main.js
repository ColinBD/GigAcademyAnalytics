let got = {
  people: false,
  teams: false,
  peopleInTeams: false
};

class Person {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }

  campfireChats = 0;
  messagesSent = 0;
  questionnaire = 0;
  toDos = 0;
  emailsForwarded = 0;
  schedule = 0;
  docsAndFiles = 0;

  present() {
    //note: automatic check-ins are called questionnaires in the api return
    $("#acContent").html(`
			<h2>Stats for ${this.name}</h2>
			<ul>
				<li>Campfire chats sent: ${this.campfireChats}</li>
				<li>Messages sent: ${this.messagesSent}</li>
				<li>Automatic check-ins: ${this.questionnaire}</li> 
				<li>To-dos completed: ${this.toDos}</li>
				<li>Emails forwarded: ${this.emailsForwarded}</li>
				<li>Scheduled events created: ${this.schedule}</li>
				<li>Docs and files uploaded: ${this.docsAndFiles}</li>	
			</ul>`);
  }
}

class Team {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }
  people = [];
  campfireChats = 0;
  messagesSent = 0;
  questionnaire = 0;
  toDos = 0;
  emailsForwarded = 0;
  schedule = 0;
  docsAndFiles = 0;

  present() {
    //note: automatic check-ins are called questionnaires in the api return
    $("#acContent").html(`
			<h2>Stats for ${this.name}</h2>
			<ul>
				<li>Campfire chats sent: ${this.campfireChats}</li>
				<li>Messages sent: ${this.messagesSent}</li>
				<li>Automatic check-ins: ${this.questionnaire}</li> 
				<li>To-dos completed: ${this.toDos}</li>
				<li>Emails forwarded: ${this.emailsForwarded}</li>
				<li>Scheduled events created: ${this.schedule}</li>
				<li>Docs and files uploaded: ${this.docsAndFiles}</li>	
			</ul>`);
  }
}

let people = []; //this will hold all the Person objects associated with the project
let teams = []; //this will hold all the Team objects associated with the project
let admins = []; //this will hold a list of admins which will be used when filtering the data for collected stats
let adminList = ""; //the admin IDs as one long string

function processSelectedAccount() {
  got.people = false;
  got.teams = false;
  got.peopleInTeams = false;
  $("#acContent")
    .html("<span id='loading'>Loading...</span>")
    .css("display", "block"); //clear stats and show the loading message
  //loop through the selected account's projects list
  fetch(`/projects/${account.id}/${account.token}`)
    .then(result => result.json())
    .then(result => {
      $("#selectParticipant")
        .children()
        .remove(); //clear the selection box in preparation for filling it with data
      $("#selectTeam")
        .children()
        .remove(); //clear the selection box in preparation for filling it with data
      $("#selectParticipant").append(
        $("<option>", {
          value: "",
          text: "- choose -",
          selected: true,
          disabled: true
        })
      ); //add to selection list
      $("#selectTeam").append(
        $("<option>", {
          value: "",
          text: "- choose -",
          selected: true,
          disabled: true
        })
      ); //add to selection list
      //clear the people and team arrays
      people = [];
      teams = [];
      const data = JSON.parse(result.data);
      data.map(item => {
        if (item.purpose == "team") {
          teams.push(new Team(item.name, item.id)); //add to team array
          $("#selectTeam").append(
            $("<option>", { value: item.id, text: item.name })
          ); //add to selection list
        } else if (item.purpose == "company_hq") {
          //we can get the people list from here
          //store the ID for this project and we'll use it to get people
          account.HQ_id = item.id;
          getPeople();
        }
      });
      //check if we've finished loading the data
      got.teams = true;
      if (got.people == true && got.teams == true) {
        selectedAccountDOMUpdate();
      }
    })
    .catch(error => {
      console.error(error);
    });
}

function getPeople() {
  //get the list of people associated with the account and flesh out the 'people' array with Person objects
  fetch(`/getPeople/${account.id}/${account.token}/${account.HQ_id}`)
    .then(result => result.json())
    .then(result => {
      const data = JSON.parse(result.data);
      data.map(item => {
        //if people are admins then add them to the admins array which will be used for filtering
        if (item.admin == true) {
          admins.push(item.id);
        }
        if (item.personable_type !== "Integration" && item.admin == false) {
          people.push(new Person(item.name, item.id)); //add to people array
          $("#selectParticipant").append(
            $("<option>", { value: item.id, text: item.name })
          ); //add to selection list
        }
      });
      //check if we've finished loading the data
      got.people = true;
      if (got.people == true && got.teams == true) {
        selectedAccountDOMUpdate();
      }
    })
    .catch(error => {
      console.error(error);
    });
}

function selectedAccountDOMUpdate() {
  $("#btnSwitchAc").css("visibility", "visible"); //show the switch accounts buttons
  $("#schoolName")
    .html(`for  ${account.name}`)
    .css("visibility", "visible"); //prepare & show the "for account..." header label
  $("#selectorBar").css("display", "inline-block"); //display selector bar
  $("#loading").css("display", "none"); //remove the loading message
  //load more data
  loadMore();
}

function loadMore() {
  //now flesh out the teams with all the people in the team
  for (let index = 0; index < teams.length; index++) {
    // fetch the list of users associated with each team
    fetch(`/getPeopleInTeams/${account.id}/${account.token}/${teams[index].id}`)
      .then(result => result.json())
      .then(result => {
        //put the returned data into the team array object
        const data = JSON.parse(result.data);
        for (let i = 0; i < data.length; i++) {
          teams[index].people.push(data[i].id);
          teams[index].people.push(data[i].name);
        }
        got.peopleInTeams = true;
      })
      .catch(error => console.error(error));
  }
}

//triggered by a 'select participant' drop-down interaction
function changeParticipant(index) {
  //reset the other selection box default values
  $("#selectTeam :nth-child(1)").prop("selected", true);
  $("#selectStat :nth-child(1)").prop("selected", true);
  if (got.peopleInTeams != true) {
    //show the still loading message
    $("#acContent")
      .html(
        "<span id='loading'>Still generating background data on people. Please try again shortly</span>"
      )
      .css("display", "block"); //clear stats and show the loading message
  } else {
    //proceed to generate the stats for this person
    $("#acContent")
      .html("<span id='loading'>Loading...</span>")
      .css("display", "block"); //clear stats and show the loading message
    //check what team the person is in
    let teamID = [];
    for (let i = 0; i < teams.length; i++) {
      if (teams[i].people.includes(people[index].id)) {
        teamID.push(teams[i].id);
      }
    }
    console.log(
      `this person was found in ${teamID.length} teams and has id ${
        people[index].id
      }`
    );
    if (teamID.length == 0) {
      $("#acContent").html(`
      <p>This user was not found in any account</p>`);
      return;
    }
    //As a person could be in more than one team we must loop through their teams, adding the results from each team before putting these collated results into the people object.
    let dockItems = {
      chats: 0,
      messages: 0,
      questionnaires: 0,
      toDos: 0,
      emails: 0,
      schedule: 0,
      docs: 0
    };
    let awaiting = teamID.length;
    for (let i = 0; i < teamID.length; i++) {
      fetch(
        `/getPersonInfo/${account.id}/${account.token}/${people[index].id}/${
          teamID[i]
        }`
      )
        .then(result => result.json())
        .then(result => {
          //put the returned data into the team array object
          // console.log(
          //   `Getting stats for ${people[index].name} who has ID: ${
          //     people[index].id
          //   }`
          // );
          //console.dir(result);
          const data = JSON.parse(result.data);
          dockItems.chats += data.campfireChats;
          dockItems.messages += data.messagesSent;
          dockItems.questionnaires += data.questionnaire;
          dockItems.toDos += data.toDos;
          dockItems.emails += data.emailsForwarded;
          dockItems.schedule += data.schedule;
          dockItems.docs += data.docsAndFiles;
          awaiting--;
          if (awaiting == 0) {
            //prepare stats for this person
            people[index].campfireChats = dockItems.chats;
            people[index].messagesSent = dockItems.messages;
            people[index].questionnaire = dockItems.questionnaires;
            people[index].toDos = dockItems.toDos;
            people[index].emailsForwarded = dockItems.emails;
            people[index].schedule = dockItems.schedule;
            people[index].docsAndFiles = dockItems.docs;

            people[index].present(); //display the team data on screen
          }
        })
        .catch(error => console.error(error));
    }
  }
}

//triggered by a 'select group' drop-down interaction
function changeTeam(index) {
  $("#acContent")
    .html("<span id='loading'>Loading...</span>")
    .css("display", "block"); //clear stats and show the loading message
  //reset the other selection box default values
  $("#selectParticipant :nth-child(1)").prop("selected", true);
  $("#selectStat :nth-child(1)").prop("selected", true);
  //generate the admin IDs list
  adminList = "";
  admins.map(item => (adminList += item));
  //prepare team stats
  fetch(
    `/getTeamInfo/${account.id}/${account.token}/${
      teams[index].id
    }/${adminList}`
  )
    .then(result => result.json())
    .then(result => {
      //put the returned data into the team array object
      const data = JSON.parse(result.data);
      teams[index].campfireChats = data.chat;
      teams[index].messagesSent = data.message_board;
      teams[index].questionnaire = data.questionnaire;
      teams[index].toDos = data.todoset;
      teams[index].emailsForwarded = data.inbox;
      teams[index].schedule = data.schedule;
      teams[index].docsAndFiles = data.vault;

      teams[index].present(); //display the team data on screen
    })
    .catch(error => console.error(error));
}

function changeStat(index) {
  $("#acContent")
    .html("<span id='loading'>Loading...</span>")
    .css("display", "block"); //clear stats and show the loading message
  //reset the other selection box default values
  $("#selectParticipant :nth-child(1)").prop("selected", true);
  $("#selectTeam :nth-child(1)").prop("selected", true);
  $("#acContent").html(`
			<h2>${index.value} stats</h2>
			<p>Relevant statistical information will go here</p>`);
}
